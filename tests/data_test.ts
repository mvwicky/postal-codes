import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";

import { type Config, getConfig } from "../src/config.ts";
import { loadCountryData } from "../src/data.ts";

async function patchConfig(
	newConfig: Partial<Config>,
): Promise<{ config: Config; restore: () => void }> {
	const config = await getConfig();
	const origConfig: Config = { ...config };
	const replacementConfig: Config = { ...origConfig, ...newConfig };
	Object.assign(config, replacementConfig);
	return {
		config,
		restore: () => Object.assign(config, origConfig),
	};
}

test("patch config", async () => {
	const dataDir = "fake-data-dir-name";
	const { restore, config } = await patchConfig({ dataDir });
	expect(config.dataDir).toEqual(dataDir);
	restore();
	expect(config.dataDir).not.toEqual(dataDir);
});

describe("load", async () => {
	const dataDir = await fs.mkdtemp("postal-codes-");
	const { restore } = await patchConfig({ dataDir });
	test("US data", async () => {
		const data = await loadCountryData("US", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size).toEqual(0);
	});
	test("CA data", async () => {
		const data = await loadCountryData("CA", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size).toEqual(0);
	});
	restore();
});

describe("download data", async () => {
	const dataDir = await fs.mkdtemp("postal-codes-");
	const { restore } = await patchConfig({ downloadMaxAge: 0, dataDir });
	test("US data", async () => {
		const data = await loadCountryData("US", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size ?? 0).not.toEqual(0);
	});
	test("CA data", async () => {
		const data = await loadCountryData("CA", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size ?? 0).not.toEqual(0);
	});
	restore();
});

test("fetch timeout", async () => {
	const dataDir = await fs.mkdtemp("postal-codes-");
	const { restore } = await patchConfig({ dataDir });
	const data = await loadCountryData("US", {
		forceReload: true,
		fetchTimeout: 1,
	});
	expect(data).toBeNull();
	restore();
});
