import { format } from "std/fmt/duration.ts";
import * as path from "std/path/mod.ts";

import { logger, setupLogging } from "./log.ts";
import { hDist, type Point } from "./distance.ts";
import { loadZIPs } from "./data.ts";

if (import.meta.main) {
  const start = performance.now();
  await setupLogging();
  const log = logger();
  if (Deno.args.length < 2) {
    log.warning("Two ZIP codes required.");
    Deno.exit(1);
  }
  const dataFilePath = path.join(Deno.cwd(), "data", "zip_code_database.csv");
  const entryMap = await loadZIPs(dataFilePath);
  const [zip1, zip2] = Deno.args;
  const z1 = entryMap.get(zip1);
  if (!z1) {
    log.error(`Unable to find ZIP code ${zip1}`);
  }
  const z2 = entryMap.get(zip2);
  if (!z2) {
    log.error(`Unable to find ZIP code ${zip2}`);
  }
  if (z1 && z2) {
    const p1: Point = [z1.latitude, z1.longitude];
    const p2: Point = [z2.latitude, z2.longitude];
    log.info(`${z1.zip} -> (${p1[0]}, ${p1[1]})`);
    log.info(`${z2.zip} -> (${p2[0]}, ${p2[1]})`);
    const d = hDist(p1, p2);
    const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    log.info(`${fmt.format(d / 1000)} km`);
    log.info(`${fmt.format(d / 1609)} miles`);
  }
  log.info(
    `Elapsed: ${format(performance.now() - start, { ignoreZero: true })}`,
  );
}
