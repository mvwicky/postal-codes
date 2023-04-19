import { assertNotEquals } from "std/testing/asserts.ts";

import { setupLogging } from "./log.ts";
import { loadCountryData } from "./data.ts";

Deno.test(
  "load data",
  {
    permissions: { net: true, read: true, write: true, env: true },
    sanitizeResources: false,
  },
  async (t) => {
    setupLogging();
    await t.step("US", async () => {
      const data = await loadCountryData("US", 5000);
      assertNotEquals(data?.size ?? 0, 0);
    });
    await t.step("CA", async () => {
      const data = await loadCountryData("CA", 5000);
      assertNotEquals(data?.size ?? 0, 0);
    });
  },
);
