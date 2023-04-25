import { bFormat, dFormat } from "./deps.ts";
import { loadCountryData } from "./src/data.ts";
import { hDist, type Point } from "./src/distance.ts";
import { logger } from "./src/log.ts";

async function lookup(args: string[]) {
  const log = logger();
  if (args.length < 2) {
    log.warn("Two ZIP codes required.");
    Deno.exit(1);
  }
  let country = "US";
  if (args.length == 3) {
    country = args.shift() ?? "US";
  }
  const startUsage = Deno.memoryUsage();
  const entryMap = await loadCountryData(country);
  if (!entryMap) {
    log.warn(`Unable to load data. (country: ${country})`);
    Deno.exit(1);
  }
  const endUsage = Deno.memoryUsage();
  log.info(`RSS Delta: ${bFormat(endUsage.rss - startUsage.rss)}`);
  log.info(
    `Heap Used Delta: ${bFormat(endUsage.heapUsed - startUsage.heapUsed)}`,
  );
  const [zip1, zip2] = args;
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
    log.info(`${z1.postal_code} -> (${p1[0]}, ${p1[1]})`);
    log.info(`${z2.postal_code} -> (${p2[0]}, ${p2[1]})`);
    const d = hDist(p1, p2);
    const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    log.info(`${fmt.format(d / 1000)} km`);
    log.info(`${fmt.format(d / 1609)} miles`);
  } else {
    Deno.exit(1);
  }
}

async function populateDB(args: string[]) {
}

const COMMANDS = new Map<string, (args: string[]) => Promise<unknown>>([[
  "lookup",
  lookup,
], ["populate-db", populateDB]]);

if (import.meta.main) {
  const start = performance.now();
  const log = logger();
  if (Deno.args.length < 1) {
    log.warn(`No command given.`);
    Deno.exit(1);
  }
  const cmd = Deno.args[0];
  const cmdFunction = COMMANDS.get(cmd);
  if (!cmdFunction) {
    log.warn(`Unkown command "${cmd}".`);
    log.warn(`Command must be one of: ${[...COMMANDS.keys()].join(", ")}.`);
    Deno.exit(1);
  }
  await cmdFunction(Deno.args.slice(1));
  const elapsed = dFormat(performance.now() - start, { ignoreZero: true });
  log.info(`Elapsed: ${elapsed || "0s"}`);
}
