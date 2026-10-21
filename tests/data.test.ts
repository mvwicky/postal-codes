import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import { rm } from "node:fs/promises";

import { type Config, getConfig } from "../src/config.ts";
import { loadCountryData } from "../src/data.ts";

async function safeRm(dir: string) {
	try {
		await rm(dir, { recursive: true });
	} catch (_err) {}
}

async function patchConfig(newConfig: Partial<Config>): Promise<{
	config: Config;
	restore: () => void;
	[Symbol.dispose]: () => void;
}> {
	const config = await getConfig();
	const origConfig: Config = { ...config };
	const replacementConfig: Config = { ...origConfig, ...newConfig };
	Object.assign(config, replacementConfig);
	const restore = () => Object.assign(config, origConfig);
	return {
		config,
		restore,
		[Symbol.dispose]: restore,
	};
}

test("patch config", async () => {
	const dataDir = "fake-data-dir-name";
	using config = await patchConfig({ dataDir });
	expect(config.config.dataDir).toEqual(dataDir);
});

const useTempDir = () => {
	let restore: (() => void) | null = null;
	let dataDir: string | null = null;
	beforeAll(async () => {
		dataDir = await fs.mkdtemp("postal-codes-");
		const config = await patchConfig({ dataDir: dataDir });
		restore = config.restore;
	});
	afterAll(() => {
		restore?.();
		if (dataDir) {
			safeRm(dataDir);
		}
	});
};

describe("load", async () => {
	useTempDir();

	test("US data", async () => {
		const data = await loadCountryData("US", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size).not.toEqual(0);
	});
	test("CA data", async () => {
		const data = await loadCountryData("CA", {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expect(data).toBeInstanceOf(Map);
		expect(data?.size).not.toEqual(0);
	});
});

describe("download data", async () => {
	useTempDir();

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
});

test("fetch timeout", async () => {
	await using dataDir = await fs.mkdtempDisposable("postal-codes-");
	using _ = await patchConfig({ dataDir: dataDir.path });
	const data = await loadCountryData("US", {
		forceReload: true,
		fetchTimeout: 1,
	});
	expect(data).toBeNull();
});
