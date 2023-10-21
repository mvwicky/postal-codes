import { c12 } from "../deps.ts";

interface Config {
  dataDir: string;
  defaultTimeout: number;
  allowedCountries: string[];
  downloadMaxAge: number;
}

const ONE_DAY_MS = 86400 * 1000;

const DEFAULT_CONFIG: Config = {
  dataDir: "data",
  defaultTimeout: 10000,
  allowedCountries: ["US", "CA"],
  downloadMaxAge: ONE_DAY_MS * 3,
};

let _config: Config | null = null;

export async function loadConfig(): Promise<Config> {
  const { config } = await c12.loadConfig<Config>({
    name: "postal-codes",
    rcFile: false,
    defaults: DEFAULT_CONFIG,
    envName: Deno.env.get("POSTAL_CODE_ENV"),
  });
  return config ?? DEFAULT_CONFIG;
}

export async function getConfig(): Promise<Config> {
  if (!_config) {
    _config = await loadConfig();
  }
  return _config;
}

export type { Config };
