/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { exists, NodeBuffer, path } from "../deps.ts";
import { getConfig } from "./config.ts";
import { COUNTRIES, type CountryParams } from "./countries.ts";
import { logger } from "./log.ts";
import { type GeoName } from "./schemas.ts";
import * as zip from "./zipfiles.ts";

async function fetchCountryData(url: URL): Promise<NodeBuffer | null> {
  const res = await fetch(url);
  if (res.ok && res.body) {
    const aBuf = await res.arrayBuffer();
    return NodeBuffer.from(aBuf);
  }
  return null;
}

async function extractCountryData(buf: NodeBuffer, dataFileName: string) {
  // const log = logger();
  const zipFile = await zip.fromBuffer(buf, { lazyEntries: true });
  const openReadStream = zip.makeOpenReadStream(zipFile);
  zipFile.on("entry", (e) => {
    const entry = e as zip.yauzl.Entry;
    console.info(`Got entry: ${entry.fileName}`);
  });
  zipFile.readEntry();
}

async function loadCountryData(
  { url, dataFileName }: CountryParams,
): Promise<Map<string, GeoName> | null> {
  const { dataDir } = await getConfig();
  const dataFilePath = path.join(Deno.cwd(), dataDir, dataFileName);
  const fileExists = await exists(dataFilePath, {
    isReadable: true,
    isFile: true,
  });
  if (!fileExists) {
    logger().info(`Fetching file from ${url.href} (dest: ${dataFilePath})`);
    const buf = await fetchCountryData(url);
    if (buf) {
      await extractCountryData(buf, dataFileName);
    }
  }
  return null;
}

logger().info(`Worker Started.`);
self.onmessage = async ({ data }) => {
  if (data.method === "load") {
    logger().info(`Got load method: ${data.country}`);
    const country = COUNTRIES.get(data.country);
    if (country) {
      const countryData = await loadCountryData(country);
      if (countryData) {
        self.postMessage({
          method: "load",
          country: data.country,
          data: countryData,
        });
      }
    }
    self.close();
  }
};
