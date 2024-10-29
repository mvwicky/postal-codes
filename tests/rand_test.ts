import { URNG_16, URNG_32, xoroshiro128plus } from "@/src/rand.ts";
import { assertArrayIncludes, assertLess } from "@/dev_deps.ts";

Deno.test("URNGs", async (t) => {
  const URNGS = [URNG_16, URNG_32];
  for (const urng of URNGS) {
    await t.step(`${urng.name} valueIn`, () => {
      const r = new urng();
      assertLess(r.valueIn(20), 20);
    });
    await t.step(`${urng.name} choice`, () => {
      const r = new urng();
      const choices = ["a", 20, "c", 30];
      assertArrayIncludes(choices, [r.choice(choices)]);
    });
    await t.step(`${urng.name} normValue`, () => {
      const r = new urng();
      assertLess(r.normValue, 1);
    });
  }
});

Deno.test("xoroshiro128plus", async (t) => {
  const seeds = [undefined, 12345, "abcedef"];
  for (const seed of seeds) {
    await t.step(`seed: ${typeof seed}`, () => {
      const g = xoroshiro128plus(seed);
      g.next();
      g.return();
    });
  }
});

Deno.test("ALEA", { ignore: true }, () => {
});
