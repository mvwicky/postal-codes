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
  const [endR, endH] = [bFormat(end.rss), bFormat(end.heapUsed)];
  const rDelta = bFormat(end.rss - start.rss);
  const hDelta = bFormat(end.heapUsed - start.heapUsed);
  log.info(`RSS:        ${endR} (Δ${rDelta})`);
  log.info(`Heap Used:  ${endH} (Δ${hDelta})`);
}

const countryErrorString = (countryParam: string) =>
  `Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const router = new oak.Router();
router.get<InfoParams>(
  "/info/:code/",
  async ({ params: { country, code }, ...ctx }) => {
    const countryData = await loadCountryData(country);
    const codeInfo = countryData?.get(normKey(code));
    if (codeInfo) {
      ctx.response.body = codeInfo;
    } else if (!countryData) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: [countryErrorString(country)] };
    } else {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: [codeErrorString(code)] };
    }
  },
).get<DistParams>("/distance/:start/:end/", async ({ params, ...ctx }) => {
  const countryData = await loadCountryData(params.country);
  const startCode = normKey(params.start);
  const endCode = normKey(params.end);
  const startInfo = countryData?.get(startCode);
  const endInfo = countryData?.get(endCode);
  if (startInfo && endInfo) {
    const distance = hDist(toPoint(startInfo), toPoint(endInfo));
    ctx.response.body = { startInfo, endInfo, distance };
  } else {
    const error: string[] = [];
    if (!countryData) {
      error.push(countryErrorString(params.country));
    }
    if (countryData && !startInfo) {
      error.push(codeErrorString(params.start));
    }
    if (countryData && !endInfo) {
      error.push(codeErrorString(params.end));
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
).get("/health/", (ctx) => {
  ctx.response.body = { ready: true };
});

const app = new oak.Application();
app.use(async (ctx, next) => {
  logger().info(`${ctx.request.method} ${ctx.request.url}`);
  await next();
}).use(async (_ctx, next) => {
  const startUsage = Deno.memoryUsage();
  await next();
  const endMem = Deno.memoryUsage();
  queueMicrotask(() => logMemory(startUsage, endMem));
}).use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const elapsed = performance.now() - start;
  ctx.response.headers.set("Server-Timing", `cpu;dur=${elapsed.toFixed(3)}`);
}).use(async ({ response: { headers } }, next) => {
  await next();
  headers.append("Access-Control-Allow-Origin", "*");
}).use(r.routes(), r.allowedMethods());

app.addEventListener("listen", ({ hostname, port, secure }) => {
  const scheme = `http${secure ? "s" : ""}`;
  logger().info(
    `Listening on ${scheme}://${hostname ?? "localhost"}:${port}`,
  );
});

export { app };
