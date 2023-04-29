import { type Point } from "./distance.ts";
import { type GeoName } from "./schemas.ts";

function toPoint(geoName: GeoName): Point {
  return [geoName.latitude, geoName.longitude];
}

function normKey(k: string): string {
  return k.toLocaleUpperCase().replace(/\s/g, "");
}

export { normKey, toPoint };
