import { describe, expect, test } from "bun:test";

import { Alea, URNG_16, URNG_32, xoroshiro128plus } from "../src/rand.ts";

describe("URNGs", async () => {
	const URNGS = [URNG_16, URNG_32];
	for (const urng of URNGS) {
		test(`${urng.name} valueIn(stop)`, () => {
			const r = new urng();
			const v = r.valueIn(20);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(20);
		});
		test(`${urng.name} valueIn(start, stop)`, () => {
			const r = new urng();
			const v = r.valueIn(30, 40);
			expect(v).toBeGreaterThanOrEqual(30);
			expect(v).toBeLessThan(40);
		});
		test(`${urng.name} choice`, () => {
			const r = new urng();
			const choices = ["a", 20, "c", 30];
			expect(choices).toContain(r.choice(choices));
		});
		test(`${urng.name} normValue`, () => {
			const r = new urng();
			expect(r.normValue).toBeLessThan(1);
		});
	}
});

describe("xoroshiro128plus", async () => {
	const seeds = [
		[undefined, "undefined"],
		[12345, "number"],
		["abcedef", "normal characters"],
		[
			String.fromCharCode(0xd801) + String.fromCharCode(56320),
			"supplemental characters",
		],
	] as const;
	for (const [seed, name] of seeds) {
		test(`seed: ${name}`, () => {
			const g = xoroshiro128plus(seed);
			g.next();
			g.return();
		});
	}
});

describe("ALEA", () => {
	const seeds = [
		["abcedef", "normal characters"],
		[
			String.fromCharCode(0xd801) + String.fromCharCode(0xdc001),
			"supplemental characters",
		],
	] as const;
	for (const [seed, name] of seeds) {
		test(`seed: ${name}`, () => {
			const g = new Alea(seed);
			g.next();
			g.int32();
			g.uint32();
		});
	}
});
