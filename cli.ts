import { bFormat, type ConsolaInstance, dFormat } from "./deps.ts";
import { loadCountryData } from "./src/data.ts";
import { hDist } from "./src/distance.ts";
import { logger } from "./src/log.ts";
import { logMemory, normKey, toPoint } from "./src/utils.ts";

async function distance(args: string[], log: ConsolaInstance) {
  if (args.length < 2) {
    log.warn("Two ZIP codes required.");
    return 1;
  }
  const country = args.length === 3 ? args.shift() ?? "US" : "Us";
  const startUsage = Deno.memoryUsage();
  const entryMap = await loadCountryData(country);
  if (!entryMap) {
    log.warn(`Unable to load data. (country: ${country})`);
    return 1;
  }
  const endUsage = Deno.memoryUsage();
  logMemory(startUsage, endUsage, { level: "debug", log });
  const [code1, code2] = args;
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
  if (Deno.args.length < 1) {
    log.warn(`No command given.`);
    Deno.exit(1);
  }
  const [cmd, ...rest] = Deno.args;
  const cmdFunction = COMMANDS.get(cmd);
  if (!cmdFunction) {
    log.warn(`Unkown command "${cmd}".`);
    log.warn(`Command must be one of: ${[...COMMANDS.keys()].join(", ")}.`);
    Deno.exit(1);
  }
  const code = await cmdFunction(rest, log.withTag(cmd));
  const elapsed = dFormat(performance.now() - start, { ignoreZero: true });
  log.info(`Elapsed: ${elapsed || "0s"}`);
  Deno.exit(code);
}
