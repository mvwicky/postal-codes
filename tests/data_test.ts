import {
  assertEquals,
  assertInstanceOf,
  assertNotEquals,
} from "../dev_deps.ts";
import { type Config, getConfig } from "../src/config.ts";
import { loadCountryData } from "../src/data.ts";

const permissions = {
  net: true,
  read: true,
  write: true,
  env: true,
  sys: true,
};

async function patchConfig(
  newConfig: Partial<Config>,
): Promise<{ config: Config; restore: () => void }> {
  const config = await getConfig();
  const origConfig: Config = { ...config };
  const replacementConfig: Config = { ...origConfig, ...newConfig };
  Object.assign(config, replacementConfig);
  return {
    config,
    restore: () => Object.assign(config, origConfig),
  };
}

Deno.test("patch config", async () => {
  const dataDir = "fake-data-dir-name";
  const { restore, config } = await patchConfig({ dataDir });
  assertEquals(config.dataDir, dataDir);
  restore();
  assertNotEquals(config.dataDir, dataDir);
});

Deno.test(
  "load",
  async (t) => {
    await t.step("US data", async () => {
      const data = await loadCountryData("US", {
        forceReload: true,
        fetchTimeout: Infinity,
      });
      assertInstanceOf(data, Map);
      assertNotEquals(data.size, 0);
    });
    await t.step("CA data", async () => {
      const data = await loadCountryData("CA", {
        forceReload: true,
        fetchTimeout: Infinity,
      });
      assertInstanceOf(data, Map);
      assertNotEquals(data.size, 0);
    });
  },
);

Deno.test("download data", { ignore: true }, async (t) => {
  const { restore } = await patchConfig({ downloadMaxAge: 0 });
  await t.step("US data", async () => {
    const data = await loadCountryData("US", {
      forceReload: true,
      fetchTimeout: Infinity,
    });
    assertInstanceOf(data, Map);
    assertNotEquals(data.size, 0);
  });
  await t.step("CA data", async () => {
    const data = await loadCountryData("CA", {
      forceReload: true,
      fetchTimeout: Infinity,
    });
    assertInstanceOf(data, Map);
    assertNotEquals(data.size, 0);
  });
  restore();
});

Deno.test(
  "fetch timeout",
  { permissions, sanitizeResources: true },
  async () => {
    const dataDir = await Deno.makeTempDir({ prefix: "postal-codes-" });
    const { restore } = await patchConfig({ dataDir });
    const data = await loadCountryData("US", {
      forceReload: true,
      fetchTimeout: 1,
    });
    assertEquals(data, null);
    restore();
  },
);
