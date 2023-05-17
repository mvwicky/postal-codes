import {
  Buffer,
  type ConsolaInstance,
  createWriteStream,
  csv,
  ensureDir,
  exists,
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

const defaultCache = new Map<string, Map<string, GeoName>>();

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
  readonly #options: LoadOptions;

  constructor(
    country: string,
    params: CountryParams,
    options: Partial<LoadOptions> = {},
  ) {
    this.#name = country;
    this.#params = params;
    this.#log = logger().withTag(this.#name);
    this.#options = { forceReload: false, ...options };
  }

  static create(): DataLoader | null {
    return null;
  }

  private async fetch(): Promise<Buffer | null> {
    const { timeout } = this.#options;
    const signal = timeout !== undefined
      ? AbortSignal.timeout(timeout)
      : undefined;
    this.#log.info(`Fetching country data ${this.#name}`);
    try {
      const res = await fetch(this.#params.url, { signal });
      if (res.ok && res.body) {
        return Buffer.from(await res.arrayBuffer());
      } else {
        this.#log.warn(`Fetch error: "${res.statusText}"`);
      }
    } catch (err) {
      this.#log.warn(`Fetch error: ${err}`);
    }
    return null;
  }

  private async extract(buf: Buffer) {
  }

  private async parse() {
  }
}

async function fetchCountryData(url: URL): Promise<Buffer | null> {
  const res = await fetch(url, { cache: "default" });
  if (res.ok && res.body) {
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

async function extractCountryData(
  buf: Buffer,
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
  const dirExists = await exists(dataDir, { isDirectory: true });
  if (!dirExists) {
    log.info(`Creating data directory (${dataDir})`);
    await ensureDir(dataDir);
  }
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
  if (forceReload) {
    defaultCache.delete(country);
  }
  const cachedData = defaultCache.get(country);
  if (cachedData) {
    return cachedData;
  }
  const params = COUNTRIES.get(country);
  if (params) {
    const data = await doLoadCountryData(params);
    if (data) {
      defaultCache.set(country, data);
    }
    return data;
  }
  return null;
}

export { loadCountryData };
