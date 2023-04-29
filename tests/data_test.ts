import { assertNotEquals } from "../dev_deps.ts";
import { loadCountryData } from "../src/data.ts";

Deno.test(
  "load",
  {
    permissions: { net: true, read: true, write: true, env: true, sys: true },
    sanitizeResources: false,
  },
  async (t) => {
    await t.step("US data", async () => {
      const data = await loadCountryData("US", 5000);
      assertNotEquals(data?.size ?? 0, 0);
    });
    await t.step("CA data", async () => {
      const data = await loadCountryData("CA", 5000);
      assertNotEquals(data?.size ?? 0, 0);
    });
  },
);
