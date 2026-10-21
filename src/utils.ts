import type { ConsolaInstance } from "consola";

import type { Point } from "./distance.ts";
import { logger } from "./log.ts";
import type { GeoName } from "./schemas.ts";

type MemoryUsage = { rss: number; heapUsed: number };

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

function bFormat(b: number): string {
	return String(b);
}

function logMemory(
	start: MemoryUsage,
	end: MemoryUsage,
	{ level = "info", log = logger() }: LogMemoryOptions = {},
) {
	const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
	const rDelta = bFormat(end.rss - start.rss);
	const hDelta = bFormat(end.heapUsed - start.heapUsed);
	log[level](`RSS:        ${endR} (Δ${rDelta})`);
	log[level](`Heap Used:  ${endH} (Δ${hDelta})`);
}

export { logMemory, normKey, toPoint };
