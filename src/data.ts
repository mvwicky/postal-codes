import {
  type ConsolaInstance,
  createWriteStream,
  csv,
  ensureDir,
  exists,
  NodeBuffer,
  path,
} from "../deps.ts";
import { getConfig } from "./config.ts";
import { COUNTRIES, type CountryParams } from "./countries.ts";
import { logger } from "./log.ts";
import { GEO_COLUMNS, type GeoName, GeoNameSchema } from "./schemas.ts";
import { normKey } from "./utils.ts";
import * as zip from "./zipfiles.ts";

type CacheType = Map<string, Map<string, GeoName>>;
type LoadOptions = {
  timeout?: number;
  forceReload: boolean;
  cache?: CacheType;
};

const defaultCache: CacheType = new Map<string, Map<string, GeoName>>();

async function checkCountry(country: string): Promise<string | null> {
  const { allowedCountries } = await getConfig();
  const cNorm = normKey(country);
  return allowedCountries.includes(cNorm) ? cNorm : null;
}

function loadCountryDataWorker(
  country: string,
  timeout: number,
): Promise<Map<string, GeoName> | null> {
  const p = new Promise<Map<string, GeoName> | null>((resolve) => {
    logger().info(`Started worker`);
    const worker = new Worker(
      new URL("./data-worker.ts", import.meta.url).href,
      { type: "module" },
    );
    const end = (result: Map<string, GeoName> | null) => {
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = ({ data }) => {
      logger().info(`Got message: ${data}`);
      if (data.method === "load" && data.country === country) {
        end(data.data);
      } else {
        end(null);
      }
    };
    worker.onerror = () => end(null);
    worker.postMessage({ method: "load", country: country });
    setTimeout(() => {
      logger().info(`Killing worker.`);
      end(null);
    }, timeout);
  });
  return p;
}

class DataLoader {
  readonly #name: string;
  readonly #params: CountryParams;
  readonly #log: ConsolaInstance;
  readonly #options: Required<LoadOptions>;

  private constructor(
    country: string,
    params: CountryParams,
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
  }

  static async create(
    country: string,
    options: Partial<LoadOptions> = {},
  ): Promise<DataLoader | null> {
    const cNorm = await checkCountry(country);
    if (cNorm) {
      const params = COUNTRIES.get(cNorm);
      if (params) {
        return new this(cNorm, params, options);
      }
    }
    return null;
  }

  private async fetch(): Promise<NodeBuffer | null> {
    const { timeout } = this.#options;
    const signal = Number.isFinite(timeout)
      ? AbortSignal.timeout(timeout)
      : undefined;
    this.#log.info(`Fetching country data ${this.#name}`);
    try {
      const res = await fetch(this.#params.url, { signal });
      if (res.ok && res.body) {
        return NodeBuffer.from(await res.arrayBuffer());
      } else {
        this.#log.warn(`Fetch error: "${res.statusText}"`);
      }
    } catch (err) {
      this.#log.warn(`Fetch error: ${err}`);
    }
    return null;
  }

  private async extract(buf: NodeBuffer) {
  }

  private async parse() {
  }
}

async function fetchCountryData(url: URL): Promise<NodeBuffer | null> {
  const res = await fetch(url, { cache: "default" });
  if (res.ok && res.body) {
    return NodeBuffer.from(await res.arrayBuffer());
  }
  return null;
}

async function extractCountryData(
  buf: NodeBuffer,
  dataFileName: string,
  dataFilePath: string,
) {
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

async function getDataFile(
  params: CountryParams,
): Promise<string | null> {
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
): Promise<Map<string, GeoName> | null> {
  const data = new Map<string, GeoName>();
  for await (const [key, entry] of streamCountryData(params)) {
    data.set(key, entry);
  }
  return data.size ? data : null;
}

async function loadCountryData(
  country: string,
  { forceReload }: Partial<LoadOptions> = {},
): Promise<Map<string, GeoName> | null> {
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

export { loadCountryData };
