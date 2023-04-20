import * as c12 from "c12";

interface Config {
  dataDir: string;
  defaultTimeout: number;
}

const DEFAULT_CONFIG: Config = { dataDir: "data", defaultTimeout: 10000 };

let _config: Config | null = null;

export async function getConfig(): Promise<Config> {
  if (_config) {
    return _config;
  }
  const { config } = await c12.loadConfig<Config>({
    name: "postal-codes",
    rcFile: false,
    defaults: DEFAULT_CONFIG,
  });
  _config = config ?? DEFAULT_CONFIG;
  return _config;
}
