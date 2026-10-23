import type { ConsolaInstance } from "consola";

import { loadCountryData } from "./src/data.ts";
import { hDist } from "./src/distance.ts";
import { logger } from "./src/log.ts";
import { toPoint } from "./src/utils.ts";

function dFormat(d: number): string {
	const f = new Intl.DurationFormat(undefined);
	return f.format({ milliseconds: d });
}

async function distance(args: string[], log: ConsolaInstance) {
	const country = args.length === 3 ? (args.shift() ?? "US") : "Us";
	const [code1, code2] = args;
	if (!(code1 && code2)) {
		log.warn("Two ZIP codes required.");
		return 1;
	}
	const entryMap = await loadCountryData(country);
	if (!entryMap) {
		log.warn(`Unable to load data. (country: ${country})`);
		return 1;
	}
	const c1 = entryMap.get(code1);
	if (!c1) {
		log.error(`Unable to find postal code ${code1}`);
	}
	const c2 = entryMap.get(code2);
	if (!c2) {
		log.error(`Unable to find postal code ${code2}`);
	}
	if (c1 && c2) {
		const [p1, p2] = [toPoint(c1), toPoint(c2)];
		log.info(`${c1.postal_code} -> (${p1[0]}, ${p1[1]})`);
		log.info(`${c2.postal_code} -> (${p2[0]}, ${p2[1]})`);
		const d = hDist(p1, p2);
		const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });
		log.info(`${fmt.format(d / 1000)} km`);
		log.info(`${fmt.format(d / 1609.344)} miles`);
	} else {
		return 1;
	}
	return 0;
}

const COMMANDS = new Map<
	string,
	(args: string[], log: ConsolaInstance) => Promise<number>
>([["distance", distance]]);

if (import.meta.main) {
	const start = performance.now();
	const log = logger();
	const [cmd, ...rest] = process.argv;
	if (!cmd) {
		log.warn(`No command given.`);
		process.exit(1);
	}
	const cmdFunction = COMMANDS.get(cmd);
	if (!cmdFunction) {
		log.warn(`Unkown command "${cmd}".`);
		log.warn(`Command must be one of: ${[...COMMANDS.keys()].join(", ")}.`);
		process.exit(1);
	}
	const code = await cmdFunction(rest, log.withTag(cmd));
	const elapsed = dFormat(performance.now() - start);
	log.info(`Elapsed: ${elapsed || "0s"}`);
	process.exit(code);
}
