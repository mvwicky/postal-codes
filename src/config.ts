import { c12 } from "../deps.ts";

interface Config {
  dataDir: string;
  defaultTimeout: number;
  allowedCountries: string[];
}

const DEFAULT_CONFIG: Config = {
  dataDir: "data",
  defaultTimeout: 10000,
  allowedCountries: ["US", "CA"],
};

let _config: Config | null = null;

export async function getConfig(): Promise<Config> {
  if (!_config) {
    const { config } = await c12.loadConfig<Config>({
      name: "postal-codes",
      rcFile: false,
      defaults: DEFAULT_CONFIG,
    });
    _config = config ?? DEFAULT_CONFIG;
  }
  return _config;
}
