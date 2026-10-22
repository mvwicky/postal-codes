import type { ConsolaInstance } from "consola";

import type { Point } from "./distance.ts";
import { logger } from "./log.ts";
import type { GeoName } from "./schemas.ts";

type LogMemoryOptions = {
	level?: "debug" | "info";
	log?: ConsolaInstance;
};

function toPoint(geoName: GeoName): Point {
	return [geoName.latitude, geoName.longitude];
}

function normKey(k: string): string {
	return k.toLocaleUpperCase().replace(/\s/g, "");
}

const UNITS = ["", "k", "M", "G", "T", "P", "E", "Z", "Y", "R", "Q"] as const;
const LAST_UNIT = UNITS.length - 1;
const sizeFmt = new Intl.NumberFormat(undefined, {
	style: "decimal",
	maximumFractionDigits: 2,
	minimumFractionDigits: 0,
});

function bFormat(n: number, fmt: Intl.NumberFormat = sizeFmt): string {
	const isNeg = n < 0;
	const prefix = isNeg ? "-" : "";
	if (isNeg) {
		n = -n;
	}
	if (n < 1) {
		return `${prefix}${fmt.format(n)} B`;
	}
	const exp = Math.min(Math.floor(Math.log10(n) / 3), LAST_UNIT);
	n = n / 1000 ** exp;
	return `${prefix}${!exp ? n : fmt.format(n)} ${UNITS[exp]}B`;
}

function logMemory(
	start: NodeJS.MemoryUsage,
	end: NodeJS.MemoryUsage,
	{ level = "info", log = logger() }: LogMemoryOptions = {},
) {
	const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
	const rDelta = bFormat(end.rss - start.rss);
	const hDelta = bFormat(end.heapUsed - start.heapUsed);
	log[level](`RSS:        ${endR} (Δ${rDelta})`);
	log[level](`Heap Used:  ${endH} (Δ${hDelta})`);
}

export { logMemory, normKey, toPoint };
