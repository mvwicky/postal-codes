import { type Point } from "./distance.ts";
import { type GeoName } from "./schemas.ts";
import { logger } from "./log.ts";
import { bFormat, ConsolaInstance } from "../deps.ts";

function toPoint(geoName: GeoName): Point {
  return [geoName.latitude, geoName.longitude];
}

function normKey(k: string): string {
  return k.toLocaleUpperCase().replace(/\s/g, "");
}

function logMemory(
  start: Deno.MemoryUsage,
  end: Deno.MemoryUsage,
  level: "debug" | "info" = "info",
  log?: ConsolaInstance,
) {
  log = log ?? logger();
  const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
  const rDelta = bFormat(end.rss - start.rss);
  const hDelta = bFormat(end.heapUsed - start.heapUsed);
  log[level](`RSS:        ${endR} (Δ${rDelta})`);
  log[level](`Heap Used:  ${endH} (Δ${hDelta})`);
}

export { logMemory, normKey, toPoint };
