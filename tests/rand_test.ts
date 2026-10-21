import { describe, expect, test } from "bun:test";

import { URNG_16, URNG_32, xoroshiro128plus } from "../src/rand.ts";

describe("URNGs", async () => {
	const URNGS = [URNG_16, URNG_32];

	for (const urng of URNGS) {
		test(`${urng.name} valueIn`, () => {
			const r = new urng();
			expect(r.valueIn(20)).toBeLessThan(20);
		});
		test(`${urng.name} choice`, () => {
			const r = new urng();
			const choices = ["a", 20, "c", 30];
			//@ts-expect-error
			expect(choices).toInclude([r.choice(choices)]);
		});
		test(`${urng.name} normValue`, () => {
			const r = new urng();
			expect(r.normValue).toBeLessThan(1);
		});
	}
});

describe("xoroshiro128plus", async () => {
	const seeds = [undefined, 12345, "abcedef"];
	for (const seed of seeds) {
		test(`seed: ${typeof seed}`, () => {
			const g = xoroshiro128plus(seed);
			g.next();
			g.return();
		});
	}
});

test.todo("ALEA", () => {});
