/// <reference no-default-lib="true" />

import { Buffer } from "node:buffer";
import * as path from "node:path";

import { getConfig } from "./config.ts";
import { COUNTRIES, type CountryParams } from "./countries.ts";
import { logger } from "./log.ts";
import type { GeoName } from "./schemas.ts";
import * as zip from "./zipfiles.ts";

declare var self: Worker;

async function fetchCountryData(url: URL): Promise<Buffer | null> {
	const res = await fetch(url);
	if (res.ok && res.body) {
		const aBuf = await res.arrayBuffer();
		return Buffer.from(aBuf);
	}
	return null;
}

async function extractCountryData(buf: Buffer, _dataFileName: string) {
	// const log = logger();
	const zipFile = await zip.fromBuffer(buf, { lazyEntries: true });
	const _openReadStream = zip.makeOpenReadStream(zipFile);
	zipFile.on("entry", (e) => {
		const entry = e as zip.yauzl.Entry;
		console.info(`Got entry: ${entry.fileName}`);
	});
	zipFile.readEntry();
}

async function loadCountryData({
	url,
	dataFileName,
}: CountryParams): Promise<Map<string, GeoName> | null> {
	const { dataDir } = await getConfig();
	const dataFilePath = path.join(process.cwd(), dataDir, dataFileName);
	const fd = Bun.file(dataFilePath);
	const fileExists = await fd.exists();
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
		process.exit(0);
	}
};
