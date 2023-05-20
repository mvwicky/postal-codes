import {
  type ConsolaInstance,
  createWriteStream,
  csv,
  ensureDir,
  exists,
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
  readonly #file: string;

  private constructor(
    country: string,
    params: CountryParams,
    config: Config,
    options: Partial<LoadOptions> = {},
  ) {
    this.#name = country;
    this.#params = params;
    this.#log = logger().withTag(this.#name);
    this.#options = {
      forceReload: false,
      cache: defaultCache,
      timeout: Infinity,
      ...options,
    };
    this.#file = path.resolve(
      Deno.cwd(),
      config.dataDir,
      params.outputFileName,
    );
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
    this.#log.info(`Data file path: ${this.#file}`);
    const fileExists = await exists(this.#file, { isFile: true });
    if (!fileExists) {
      const buf = await this.fetch();
      if (buf) {
        const res = await this.extract(buf);
        if (!res) {
          return null;
        }
      }
    } else {
      this.#log.info(`File already exists.`);
    }
    const data: CountryData = new Map();
    const file = await Deno.open(this.#file, { read: true });
    for await (const [key, entry] of this.parse(file)) {
      data.set(key, entry);
    }
    return data.size ? data : null;
  }

  private async fetch(): Promise<ArrayBuffer | null> {
    const { timeout } = this.#options;
    const signal = Number.isFinite(timeout)
      ? AbortSignal.timeout(timeout)
      : undefined;
    this.#log.info(`Fetching country data ${this.#name}`);
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
    this.#log.info("Parsing CSV data.");
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

async function fetchCountryData(url: URL): Promise<ArrayBuffer | null> {
  const res = await fetch(url);
  if (res.ok && res.body) {
    const arrBuf = await res.arrayBuffer();
    return arrBuf;
  }
  return null;
}

async function extractCountryData(
  buf: ArrayBuffer,
  dataFileName: string,
  dataFilePath: string,
): Promise<string | null> {
  const log = logger();
  const zipFile = await zip.fromBuffer(buf, { lazyEntries: true });
  const openReadStream = zip.makeOpenReadStream(zipFile);
  return new Promise<string | null>((resolve, reject) => {
    zipFile.on("entry", async (e) => {
      const entry = e as zip.yauzl.Entry;
      log.info(`Got entry: ${entry.fileName}`);
      if (entry.fileName === dataFileName) {
        log.info(`Entry matches data file name`);
        const stream = await openReadStream(entry);
        const outFile = createWriteStream(dataFilePath);
        stream.on("end", () => {
          log.info(`Stream ended`);
          resolve(dataFilePath);
        });
        stream.pipe(outFile);
      } else {
        zipFile.readEntry();
      }
    });
    zipFile.on("end", () => {
      log.info("ZIP File Ended");
    });
    zipFile.on("error", (event) => reject(event));
    zipFile.readEntry();
  });
}

async function* parseCountryData(
  dataFile: string,
): AsyncGenerator<[string, GeoName]> {
  const file = await Deno.open(dataFile, { read: true });
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
  logger().info(`${failed} failures out of ${total} total rows`);
}

async function getDataFile(params: CountryParams): Promise<string | null> {
  const log = logger();
  const cfg = await getConfig();
  const dataDir = path.resolve(Deno.cwd(), cfg.dataDir);
  // const dirExists = await exists(dataDir, { isDirectory: true });
  await ensureDir(dataDir);
  // if (!dirExists) {
  //   log.info(`Creating data directory (${dataDir})`);
  // }
  const dataFilePath = path.join(dataDir, params.outputFileName);
  log.info(`Data file path: ${dataFilePath}`);
  const fileExists = await exists(dataFilePath, { isFile: true });
  if (!fileExists) {
    log.info(`Fetching file from ${params.url.href} (dest: ${dataFilePath})`);
    const buf = await fetchCountryData(params.url);
    if (buf) {
      return extractCountryData(buf, params.dataFileName, dataFilePath);
    }
  } else {
    log.info(`File already exists.`);
  }
  return dataFilePath;
}

async function* streamCountryData(
  params: CountryParams,
): AsyncGenerator<[string, GeoName]> {
  const dataFilePath = await getDataFile(params);
  if (dataFilePath) {
    yield* parseCountryData(dataFilePath);
  }
}

async function doLoadCountryData(
  params: CountryParams,
): Promise<CountryData | null> {
  const data: CountryData = new Map();
  for await (const [key, entry] of streamCountryData(params)) {
    data.set(key, entry);
  }
  return data.size ? data : null;
}

async function loadCountryData(
  country: string,
  { forceReload }: Partial<LoadOptions> = {},
): Promise<CountryData | null> {
  const cNorm = await checkCountry(country);
  if (cNorm) {
    if (forceReload) {
      defaultCache.delete(cNorm);
    }
    const cachedData = defaultCache.get(cNorm);
    if (cachedData) {
      return cachedData;
    }
    const params = COUNTRIES.get(cNorm);
    if (params) {
      const data = await doLoadCountryData(params);
      if (data) {
        defaultCache.set(cNorm, data);
      }
      return data;
    }
  }

  return null;
}

export { DataLoader, loadCountryData };
