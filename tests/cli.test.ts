import { describe, expect, test } from "bun:test";

import { main } from "../cli";

test("no command given", async () => {
	const exitCode = await main(["", ""]);
	expect(exitCode).toEqual(1);
});

test("unknown command given", async () => {
	const exitCode = await main(["", "", "fake"]);
	expect(exitCode).toEqual(1);
});

describe("distance command", () => {
	const run = async (args: string[], expectedCode: number = 0) => {
		const exitCode = await main(["", "", "distance", ...args]);
		expect(exitCode, "Unexpected exit code.").toEqual(expectedCode);
	};

	test("not enough arguments", async () => {
		await run(["93101"], 1);
	});

	test("no country given", async () => {
		await run(["02119", "93103"]);
	});

	test("unable to load", async () => {
		await run(["USA", "02119", "93103"], 1);
	});

	test.each([
		["US", "02119", "93103"],
		["CA", "S7V", "T3S"],
	])("%s %s -> %s", async (country, start, end) => {
		await run([country, start, end]);
	});

	test.each([
		["US", "0211A", "93103"],
		["US", "02119", "9310A"],
		["CA", "999", "T3S"],
		["CA", "S7V", "999"],
	])("fail: %s %s -> %s", async (country, start, end) => {
		await run([country, start, end], 1);
	});
});

describe("info command", () => {
	test.each([
		["US", "02119"],
		["CA", "S7V"],
	])("%s %s", async (country, code) => {
		const exitCode = await main(["", "", "info", country, code]);
		expect(exitCode).toEqual(0);
	});
});

describe("load command", () => {
	test("run", async () => {
		const exitCode = await main(["", "", "load"]);
		expect(exitCode).toEqual(0);
	});
});
