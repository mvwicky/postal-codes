import { bFormat, oak, Status } from "../deps.ts";
import { loadCountryData } from "./data.ts";
import { hDist } from "./distance.ts";
import { logger } from "./log.ts";
import { normKey, toPoint } from "./utils.ts";

type CountryParams = { country: string };
type InfoParams = CountryParams & { code: string };
type DistParams = CountryParams & { start: string; end: string };

function logMemory(start: Deno.MemoryUsage, end: Deno.MemoryUsage) {
  const log = logger();
  log.info("RSS Δ:       ", bFormat(end.rss - start.rss));
  log.info("Heap Used Δ: ", bFormat(end.heapUsed - start.heapUsed));
  log.info("RSS:         ", bFormat(end.rss));
  log.info("Heap Used:   ", bFormat(end.heapUsed));
}

const countryErrorString = (countryParam: string) =>
  `Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const router = new oak.Router();
router.get<InfoParams>("/info/:code/", async (ctx) => {
  const countryData = await loadCountryData(ctx.params.country);
  const code = normKey(ctx.params.code);
  const codeInfo = countryData?.get(code);
  if (codeInfo) {
    ctx.response.body = codeInfo;
  } else if (!countryData) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: [countryErrorString(ctx.params.country)] };
  } else {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: [codeErrorString(ctx.params.code)] };
  }
}).get<DistParams>("/distance/:start/:end/", async (ctx) => {
  const countryData = await loadCountryData(ctx.params.country);
  const startCode = normKey(ctx.params.start);
  const endCode = normKey(ctx.params.end);
  const start = countryData?.get(startCode);
  const end = countryData?.get(endCode);
  if (start && end) {
    const distance = hDist(toPoint(start), toPoint(end));
    ctx.response.body = { start, end, distance };
  } else {
    const error: string[] = [];
    if (!countryData) {
      error.push(countryErrorString(ctx.params.country));
    }
    if (countryData && !start) {
      error.push(codeErrorString(ctx.params.start));
    }
    if (countryData && !end) {
      error.push(codeErrorString(ctx.params.end));
    }
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
  }
}).get<CountryParams>("/random/", async (ctx) => {
  const countryData = await loadCountryData(ctx.params.country);
  if (countryData) {
    const allCodes = [...countryData.keys()];
    const code = allCodes[Math.floor(Math.random() * allCodes.length)];
    const codeInfo = countryData.get(code)!;
    ctx.response.body = codeInfo;
  } else {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: [countryErrorString(ctx.params.country)] };
  }
});

const r = new oak.Router().use(
  "/api/:country",
  router.routes(),
  router.allowedMethods(),
);
const app = new oak.Application();
app.use(async (ctx, next) => {
  logger().info(`${ctx.request.method} ${ctx.request.url}`);
  await next();
}).use(async (_ctx, next) => {
  const startUsage = Deno.memoryUsage();
  await next();
  queueMicrotask(() => logMemory(startUsage, Deno.memoryUsage()));
}).use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const elapsed = performance.now() - start;
  ctx.response.headers.set("Server-Timing", `cpu;dur=${elapsed.toFixed(3)}`);
}).use(r.routes(), r.allowedMethods());

app.addEventListener("listen", ({ hostname, port, secure }) => {
  const scheme = `http${secure ? "s" : ""}`;
  logger().info(
    `Listening on ${scheme}://${hostname ?? "localhost"}:${port}`,
  );
});

export { app };
