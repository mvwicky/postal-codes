import * as path from "std/path/mod.ts";
import { ensureDir, exists } from "std/fs/mod.ts";
import * as csv from "std/csv/mod.ts";

import { createWriteStream } from "node:fs";
import { Buffer } from "node:buffer";

import { getConfig } from "./config.ts";
import { logger } from "./log.ts";
import {
  GEO_COLUMNS,
  type GeoName,
  GeoNameSchema,
  type ZIPEntry,
  ZIPEntrySchema,
} from "./schemas.ts";
import { COUNTRIES, type Country, type CountryData } from "./countries.ts";
import * as zip from "./zipfiles.ts";

function toZIPEntry(inp: Record<string, unknown>): ZIPEntry | null {
  const result = ZIPEntrySchema.safeParse(inp);
  if (result.success) {
    return result.data;
  } else {
    logger().debug(`parse failed: ${result.error}`);
    return null;
  }
}

async function loadZIPs(filePath: string): Promise<Map<string, ZIPEntry>> {
  const entryMap = new Map<string, ZIPEntry>();
  const file = await Deno.open(filePath, { read: true });
  const rows = file.readable
    .pipeThrough(new TextDecoderStream("utf-8"))
    .pipeThrough(new csv.CsvParseStream({ skipFirstRow: true }));
  let [total, failed] = [0, 0];
  for await (const elem of rows) {
    total += 1;
    const entry = toZIPEntry(elem);
    if (entry) {
      entryMap.set(entry.zip, entry);
    } else {
      failed += 1;
    }
  }
  logger().info(`${failed} failures out of ${total} total rows`);
  return entryMap;
}

function loadCountryDataWorker(
  country: Country,
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

async function fetchCountryData(url: URL): Promise<Buffer | null> {
  const res = await fetch(url, { cache: "default" });
  if (res.ok && res.body) {
    const aBuf = await res.arrayBuffer();
    return Buffer.from(aBuf);
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

async function parseCountryData(
  dataFileName: string,
): Promise<Map<string, GeoName>> {
  const geoNames = new Map<string, GeoName>();
  const file = await Deno.open(dataFileName, { read: true });
  const rows = file.readable
    .pipeThrough(new TextDecoderStream("utf-8"))
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
      geoNames.set(res.data.postal_code, res.data);
    } else {
      failed += 1;
    }
  }
  logger().info(`${failed} failures out of ${total} total rows`);
  return geoNames;
}

async function doLoadCountryData(
  { url, dataFileName }: CountryData,
): Promise<Map<string, GeoName> | null> {
  const log = logger();
  const cfg = await getConfig();
  const dataDir = path.join(Deno.cwd(), cfg.dataDir);
  const dirExists = await exists(dataDir, { isDirectory: true });
  if (!dirExists) {
    log.info(`Creating data directory (${dataDir})`);
    await ensureDir(dataDir);
  }
  const dataFilePath = path.join(dataDir, dataFileName);
  log.info(`Data file path: ${dataFilePath}`);
  const fileExists = await exists(dataFilePath, { isFile: true });
  if (!fileExists) {
    log.info(`Fetching file from ${url.href} (dest: ${dataFilePath})`);
    const buf = await fetchCountryData(url);
    if (buf) {
      const res = await extractCountryData(buf, dataFileName, dataFilePath);
      if (res) {
        log.info(`Sucessfully created file.`);
        const data = await parseCountryData(dataFilePath);
        return data;
      } else {
        return null;
      }
    }
  } else {
    log.info(`File already exists.`);
    const data = await parseCountryData(dataFilePath);
    return data;
  }
  return null;
}

async function loadCountryData(
  country: Country,
  timeout: number,
): Promise<Map<string, GeoName> | null> {
  const c = COUNTRIES.get(country);
  if (c) {
    const countryData = await doLoadCountryData(c);
    return countryData;
  }
  return null;
}

export { loadCountryData, loadZIPs, toZIPEntry };
