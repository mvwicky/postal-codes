import {
  type ConsolaInstance,
  createWriteStream,
  csv,
  difference,
  path,
} from "../deps.ts";
import { type Config, getConfig } from "./config.ts";
import { COUNTRIES, type CountryParams } from "./countries.ts";
import { logger } from "./log.ts";
import { GEO_COLUMNS, type GeoName, GeoNameSchema } from "./schemas.ts";
import { normKey } from "./utils.ts";
import * as zip from "./zipfiles.ts";

type CountryData = Map<string, GeoName>;
type CacheType = Map<string, CountryData>;
type LoadOptions = {
  timeout?: number;
  forceReload: boolean;
  cache?: CacheType;
  maxAge: number;
};

const defaultCache: CacheType = new Map();

async function checkCountry(country: string): Promise<string | null> {
  const { allowedCountries } = await getConfig();
  const cNorm = normKey(country);
  return allowedCountries.includes(cNorm) ? cNorm : null;
}

class DataLoader {
  readonly #name: string;
  readonly #params: CountryParams;
  readonly #log: ConsolaInstance;
  readonly #options: Required<LoadOptions>;
  readonly #dataDir: string;
  readonly #file: string;

  constructor(
    country: string,
    params: CountryParams,
    config: Config,
    options: Partial<LoadOptions> = {},
  ) {
    this.#name = country;
    this.#params = params;
    this.#log = logger().withTag(`${this.#name}-data`);
    this.#options = {
      forceReload: false,
      cache: defaultCache,
      timeout: config.defaultTimeout,
      maxAge: config.downloadMaxAge,
      ...options,
    };
    this.#dataDir = path.resolve(Deno.cwd(), config.dataDir);
    this.#file = path.join(this.#dataDir, params.outputFileName);
  }

  static async create(
    country: string,
    options: Partial<LoadOptions> = {},
  ): Promise<DataLoader | null> {
    const cNorm = await checkCountry(country);
    if (cNorm) {
      const params = COUNTRIES.get(cNorm);
      if (params) {
        const config = await getConfig();
        return new this(cNorm, params, config, options);
      }
    }
    return null;
  }

  async load(): Promise<CountryData | null> {
    const { forceReload, cache } = this.#options;
    if (forceReload) {
      this.#log.info("Clearing cache.");
      cache.delete(this.#name);
    } else {
      const cachedData = cache.get(this.#name);
      if (cachedData) {
        this.#log.info("Data was cached.");
        return cachedData;
      }
    }
    this.#log.debug(`Data file path: ${this.#file}`);
    const shouldFetch = await this.checkShouldFetch();
    if (shouldFetch) {
      await Deno.mkdir(this.#dataDir, { recursive: true });
      const buf = await this.fetch();
      if (buf) {
        const res = await this.extract(buf);
        if (!res) {
          return null;
        }
        const now = new Date();
        await Deno.utime(this.#file, now, now);
      } else {
        return null;
      }
    } else {
      this.#log.debug(`File already exists.`);
    }
    const data: CountryData = new Map();
    const fd = await Deno.open(this.#file);
    for await (const [key, entry] of this.parse(fd)) {
      data.set(key, entry);
    }
    const { size } = data;
    if (size) {
      cache.set(this.#name, data);
    }
    return size ? data : null;
  }

  private async checkShouldFetch(): Promise<boolean> {
    const now = new Date();
    try {
      const fd = await Deno.open(this.#file);
      const stat = await fd.stat();
      fd.close();
      const mtime = stat.mtime ?? now;
      const age = difference(now, stat.mtime ?? now, {
        units: ["days", "seconds", "milliseconds"],
      });
      this.#log.debug(`Current file age: ${Deno.inspect(age)}`);
      return this.#options.maxAge < age.milliseconds!;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        this.#log.info("File not found.");
      }
      return true;
    }
  }

  private async fetch(): Promise<ArrayBuffer | null> {
    const { timeout } = this.#options;
    this.#log.debug("Timeout", timeout);
    const signal = Number.isFinite(timeout)
      ? AbortSignal.timeout(timeout)
      : undefined;
    this.#log.info(`Fetching country data`);
    try {
      const res = await fetch(this.#params.url, { signal });
      if (res.ok && res.body) {
        const arrBuf = await res.arrayBuffer();
        return arrBuf;
      } else {
        this.#log.warn(`Fetch error: "${res.statusText}"`);
      }
    } catch (err) {
      this.#log.warn(`Fetch error: ${err}`);
    }
    return null;
  }

  private async extract(buf: ArrayBuffer): Promise<string | null> {
    this.#log.info(`Extracting zipped data.`);
    const { dataFileName } = this.#params;
    const zipFile = await zip.fromBuffer(buf, { lazyEntries: true });
    const openReadStream = zip.makeOpenReadStream(zipFile);
    return new Promise((resolve, reject) => {
      let resValue: string | null = null;
      zipFile.on("entry", async (e) => {
        const entry = e as zip.yauzl.Entry;
        this.#log.info(`Got entry: ${entry.fileName}`);
        if (entry.fileName === dataFileName) {
          this.#log.info(`Entry matches data file name`);
          const stream = await openReadStream(entry);
          const outFile = createWriteStream(this.#file);
          stream.on("end", () => {
            this.#log.info(`Stream ended`);
            resValue = this.#file;
            zipFile.readEntry();
          });
          stream.pipe(outFile);
        } else {
          zipFile.readEntry();
        }
      });
      zipFile.on("end", () => {
        this.#log.info("ZIP File Ended");
        resolve(resValue);
      });
      zipFile.on("error", (event) => reject(event));
      zipFile.readEntry();
    });
  }

  private async *parse(file: Deno.FsFile): AsyncGenerator<[string, GeoName]> {
    this.#log.debug("Parsing CSV data.");
    const rows = file.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new csv.CsvParseStream({
          skipFirstRow: false,
          separator: "\t",
          columns: GEO_COLUMNS,
        }),
      );
    let [total, failed] = [0, 0];
    for await (const elem of rows) {
      total += 1;
      const res = GeoNameSchema.safeParse(elem);
      if (res.success) {
        const key = normKey(res.data.postal_code);
        yield [key, res.data];
      } else {
        failed += 1;
      }
    }
    this.#log.info(`${failed} failures out of ${total} total rows`);
  }
}

async function loadCountryData(
  country: string,
  options: Partial<LoadOptions> = {},
): Promise<CountryData | null> {
  const loader = await DataLoader.create(country, options);
  return loader?.load() ?? null;
}

export { DataLoader, loadCountryData };
