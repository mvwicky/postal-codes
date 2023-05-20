import { assertInstanceOf, assertNotEquals } from "../dev_deps.ts";
import { DataLoader, loadCountryData } from "../src/data.ts";

Deno.test(
  "load",
  {
    permissions: { net: true, read: true, write: true, env: true, sys: true },
    sanitizeResources: false,
  },
  async (t) => {
    await t.step("US data", async () => {
      const data = await loadCountryData("US", { forceReload: true });
      assertInstanceOf(data, Map);
      assertNotEquals(data.size, 0);
    });
    await t.step("CA data", async () => {
      const data = await loadCountryData("CA", { forceReload: true });
      assertInstanceOf(data, Map);
      assertNotEquals(data.size, 0);
    });
  },
);

Deno.test(
  "load with DataLoader",
  {
    permissions: { net: true, read: true, write: true, env: true, sys: true },
    sanitizeResources: false,
  },
  async (t) => {
    await t.step({
      name: "US data",
      // ignore: true,
      fn: async () => {
        const loader = await DataLoader.create("US");
        const data = await loader?.load();
        assertInstanceOf(data, Map);
        assertNotEquals(data.size, 0);
      },
    });
    await t.step({
      name: "CA data",
      ignore: true,
      fn: async () => {
        const loader = await DataLoader.create("CA");
        const data = await loader?.load();
        assertInstanceOf(data, Map);
        assertNotEquals(data.size, 0);
      },
    });
  },
);
