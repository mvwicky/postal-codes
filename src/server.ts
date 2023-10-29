import { bFormat, cors, hono, Status } from "../deps.ts";
import { loadCountryData } from "./data.ts";
import { hDist } from "./distance.ts";
import { logger } from "./log.ts";
import { normKey, toPoint } from "./utils.ts";

function logMemory(start: Deno.MemoryUsage, end: Deno.MemoryUsage) {
  const log = logger();
  const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
  const rDelta = bFormat(end.rss - start.rss);
  const hDelta = bFormat(end.heapUsed - start.heapUsed);
  log.info(`RSS:        ${endR} (Δ${rDelta})`);
  log.info(`Heap Used:  ${endH} (Δ${hDelta})`);
}

const countryErrorString = (countryParam: string) =>
  `Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const countryApp = new hono.Hono().basePath(":country/");
countryApp.get("info/:code/", async (c) => {
  const { code, country } = c.req.param();
  const countryData = await loadCountryData(country);
  const codeInfo = countryData?.get(normKey(code));
  if (codeInfo) {
    return c.json(codeInfo);
  } else if (!countryData) {
    c.status(Status.BadRequest);
    return c.json({ error: [countryErrorString(country)] });
  } else {
    c.status(Status.BadRequest);
    return c.json({ error: [codeErrorString(code)] });
  }
}).get("distance/:start/:end/", async (c) => {
  const { country, start, end } = c.req.param();
  const countryData = await loadCountryData(country);
  const startCode = normKey(start);
  const endCode = normKey(end);
  const startInfo = countryData?.get(startCode);
  const endInfo = countryData?.get(endCode);
  if (startInfo && endInfo) {
    const distance = hDist(toPoint(startInfo), toPoint(endInfo));
    return c.json({ startInfo, endInfo, distance });
  } else {
    const error: string[] = [];
    if (!countryData) {
      error.push(countryErrorString(country));
    }
    if (countryData && !startInfo) {
      error.push(codeErrorString(start));
    }
    if (countryData && !endInfo) {
      error.push(codeErrorString(end));
    }
    c.status(Status.BadRequest);
    return c.json({ error });
  }
}).get("random/", async (c) => {
  const { country } = c.req.param();
  const countryData = await loadCountryData(country);
  if (countryData) {
    const allCodes = [...countryData.keys()];
    const code = allCodes[Math.floor(Math.random() * allCodes.length)];
    const codeInfo = countryData.get(code)!;
    return c.json(codeInfo);
  } else {
    c.status(Status.BadRequest);
    return c.json({ error: [countryErrorString(country)] });
  }
});

const app = new hono.Hono();
app.use("*", async ({ req }, next) => {
  logger().info(`${req.method} ${req.url}`);
  await next();
}).use("*", async (_ctx, next) => {
  const startUsage = Deno.memoryUsage();
  await next();
  const endMem = Deno.memoryUsage();
  queueMicrotask(() => logMemory(startUsage, endMem));
}).use("*", async ({ res: { headers } }, next) => {
  const start = performance.now();
  await next();
  const elapsed = performance.now() - start;
  headers.set("Server-Timing", `cpu;dur=${elapsed.toFixed(3)}`);
}).use("*", cors());
app.route("/api/", countryApp);
app.get("/health/", (c) => c.json({ ready: true }));

export { app };
