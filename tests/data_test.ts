import {
  assertEquals,
  assertInstanceOf,
  assertNotEquals,
} from "../dev_deps.ts";
import { DataLoader, loadCountryData } from "../src/data.ts";
import { type Config, getConfig } from "../src/config.ts";

async function patchConfig(newConfig: Partial<Config>): Promise<() => void> {
  const config = await getConfig();
  const origConfig: Config = { ...config };
  const replacementConfig: Config = { ...origConfig, ...newConfig };
  Object.assign(config, replacementConfig);
  return () => {
    // Restore config.
    Object.assign(config, origConfig);
  };
}

Deno.test("patch config", async () => {
  const dataDir = "fake-data-dir-name";
  const restore = await patchConfig({ dataDir });
  const config = await getConfig();
  assertEquals(config.dataDir, dataDir);
  restore();
  assertNotEquals(config.dataDir, dataDir);
});

Deno.test(
  "load",
  { sanitizeResources: false },
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
      fn: async () => {
        const loader = await DataLoader.create("US");
        assertInstanceOf(loader, DataLoader);
        const data = await loader.load();
        assertInstanceOf(data, Map);
        assertNotEquals(data.size, 0);
      },
    });
    await t.step({
      name: "CA data",
      fn: async () => {
        const loader = await DataLoader.create("CA");
        assertInstanceOf(loader, DataLoader);
        const data = await loader.load();
        assertInstanceOf(data, Map);
        assertNotEquals(data.size, 0);
      },
    });
  },
);

Deno.test("fetch timeout", {
  permissions: { net: true, read: true, write: true, env: true, sys: true },
  sanitizeResources: true,
}, async (t) => {
  const config = await getConfig();
  const origDataDir = config.dataDir;
  config.dataDir = await Deno.makeTempDir({ prefix: "postal-codes-" });
  const loader = await DataLoader.create("US", { timeout: 1 });
  assertInstanceOf(loader, DataLoader);
  const res = await loader.load();
  assertEquals(res, null);
  config.dataDir = origDataDir;
});
