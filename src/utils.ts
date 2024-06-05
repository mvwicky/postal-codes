import { type Point } from "./distance.ts";
import { type GeoName } from "./schemas.ts";
import { logger } from "./log.ts";
import { bFormat, ConsolaInstance } from "../deps.ts";

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

function logMemory(
  start: Deno.MemoryUsage,
  end: Deno.MemoryUsage,
  { level, log }: LogMemoryOptions = {},
) {
  log = log ?? logger();
  const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
  const rDelta = bFormat(end.rss - start.rss);
  const hDelta = bFormat(end.heapUsed - start.heapUsed);
  level = level ?? "info";
  log[level](`RSS:        ${endR} (Δ${rDelta})`);
  log[level](`Heap Used:  ${endH} (Δ${hDelta})`);
}

export { logMemory, normKey, toPoint };
