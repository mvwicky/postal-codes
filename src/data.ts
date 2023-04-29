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
import { COUNTRIES, type CountryData } from "./countries.ts";
import { logger } from "./log.ts";
import { GEO_COLUMNS, type GeoName, GeoNameSchema } from "./schemas.ts";
import { normKey } from "./utils.ts";
import * as zip from "./zipfiles.ts";

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
  readonly #cData: CountryData;
  readonly #log: ConsolaInstance;

  constructor(country: string, cData: CountryData) {
    this.#name = country;
    this.#cData = cData;
    this.#log = logger().withTag(this.#name);
  }

  private async fetch(): Promise<Buffer | null> {
    this.#log.info(`Fetching country data ${this.#name}`);
    const res = await fetch(this.#cData.url, { cache: "default" });
    if (res.ok && res.body) {
      return Buffer.from(await res.arrayBuffer());
    } else {
      this.#log.warn(`Fetch error: "${res.statusText}"`);
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
  cData: CountryData,
): Promise<string | null> {
  const log = logger();
  const cfg = await getConfig();
  const dataDir = path.resolve(Deno.cwd(), cfg.dataDir);
  const dirExists = await exists(dataDir, { isDirectory: true });
  if (!dirExists) {
    log.info(`Creating data directory (${dataDir})`);
    await ensureDir(dataDir);
  }
  const dataFilePath = path.join(dataDir, cData.outputFileName);
  log.info(`Data file path: ${dataFilePath}`);
  const fileExists = await exists(dataFilePath, { isFile: true });
  if (!fileExists) {
    log.info(`Fetching file from ${cData.url.href} (dest: ${dataFilePath})`);
    const buf = await fetchCountryData(cData.url);
    if (buf) {
      return extractCountryData(buf, cData.dataFileName, dataFilePath);
    }
  } else {
    log.info(`File already exists.`);
  }
  return dataFilePath;
}

async function* streamCountryData(
  cData: CountryData,
): AsyncGenerator<[string, GeoName]> {
  const dataFilePath = await getDataFile(cData);
  if (dataFilePath) {
    yield* parseCountryData(dataFilePath);
  }
}

async function doLoadCountryData(
  cData: CountryData,
): Promise<Map<string, GeoName> | null> {
  const data = new Map<string, GeoName>();
  for await (const [key, entry] of streamCountryData(cData)) {
    data.set(key, entry);
  }
  return data.size ? data : null;
}

async function loadCountryData(
  country: string,
  timeout?: number,
): Promise<Map<string, GeoName> | null> {
  const c = COUNTRIES.get(country);
  return c ? doLoadCountryData(c) : null;
}

export { loadCountryData };
