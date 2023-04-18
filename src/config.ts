import * as c12 from "c12";

export async function getConfig() {
  const { config } = await c12.loadConfig({
    name: "postal-codes",
    rcFile: false,
    defaults: {},
  });
  return config;
}
