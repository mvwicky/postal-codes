import * as c12 from "c12";
import * as z from "zod";

export const ConfigSchema = z.compile(
	z.object({
		dataDir: z.string(),
		defaultTimeout: z.number().min(0),
		allowedCountries: z.array(z.string()),
		downloadMaxAge: z.number().min(0),
		server: z.object({
			port: z.number(),
			hostname: z.hostname().optional(),
		}),
	}),
);

export type Config = z.infer<typeof ConfigSchema>;

const ONE_DAY_MS = 86400 * 1000;

const DEFAULT_CONFIG: Config = {
	dataDir: "data",
	defaultTimeout: 10000,
	allowedCountries: ["US", "CA"],
	downloadMaxAge: ONE_DAY_MS * 3,
	server: { port: 8000, hostname: undefined },
};

let _config: Config | null = null;

export async function loadConfig(): Promise<Config> {
	const { config } = await c12.loadConfig({
		name: "postal-codes",
		rcFile: false,
		defaults: DEFAULT_CONFIG,
		envName: process.env.POSTAL_CODE_ENV,
		schema: ConfigSchema,
	});
	return config ?? DEFAULT_CONFIG;
}

export async function getConfig(): Promise<Config> {
	if (!_config) {
		_config = await loadConfig();
	}
	return _config;
}
