import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs/promises";
import { rm } from "node:fs/promises";

import { type Config, getConfig } from "../src/config.ts";
import { getPostalCodeInfo, loadCountryData } from "../src/data.ts";
import { expectIsFailure, expectIsSuccess } from "./utils.ts";

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
	test.each(["US", "CA"])("%s", async (country) => {
		const data = await loadCountryData(country, {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expectIsSuccess(data);
		expect(data.result.size).not.toEqual(0);
	});
});

describe("get info", async () => {
	test.each([
		["US", "02119"],
		["CA", "S7V"],
	])("%s", async (country, code) => {
		const info = await getPostalCodeInfo(country, code);
		expectIsSuccess(info);
	});

	test("fail bad country", async () => {
		const info = await getPostalCodeInfo("AB", "93103");
		expect(info.status).toBe("error");
	});

	test("fail bad code", async () => {
		const info = await getPostalCodeInfo("US", "9310A");
		expect(info.status).toBe("error");
	});

	test.todo("load throws", async () => {
		mock.module("../src/data.ts", () => {
			return {
				loadCountryData: async () => {
					return 1;
				},
			};
		});

		const info = await getPostalCodeInfo("US", "9310A");
		expect(info.status).toBe("error");
	});
});

describe("download data", async () => {
	useTempDir();

	test.each(["US", "CA"])("%s", async (country) => {
		const data = await loadCountryData(country, {
			forceReload: true,
			fetchTimeout: Infinity,
		});
		expectIsSuccess(data);
		expect(data.result.size ?? 0).not.toEqual(0);
	});
});

test("fetch timeout", async () => {
	await using dataDir = await fs.mkdtempDisposable("postal-codes-");
	using _ = await patchConfig({ dataDir: dataDir.path });
	const data = await loadCountryData("US", {
		forceReload: true,
		fetchTimeout: 1,
	});
	expectIsFailure(data);
});
