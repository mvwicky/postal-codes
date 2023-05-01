import { bFormat, oak } from "../deps.ts";
import { loadCountryData } from "./data.ts";
import { hDist } from "./distance.ts";
import { logger } from "./log.ts";
import { normKey, toPoint } from "./utils.ts";

type InfoParams = { country: string; code: string };
type DistParams = { country: string; start: string; end: string };

const router = new oak.Router();
router.get<InfoParams>("/info/:code/", async (ctx) => {
  const country = normKey(ctx.params.country);
  const countryData = await loadCountryData(country);
  const code = normKey(ctx.params.code);
  const codeInfo = countryData?.get(code);
  if (codeInfo) {
    ctx.response.type = "application/json";
    ctx.response.body = JSON.stringify(codeInfo);
  }
}).get<DistParams>("/distance/:start/:end/", async (ctx) => {
  const country = normKey(ctx.params.country);
  const countryData = await loadCountryData(country);
  const startCode = normKey(ctx.params.start);
  const start = countryData?.get(startCode);
  const endCode = normKey(ctx.params.end);
  const end = countryData?.get(endCode);
  if (start && end) {
    ctx.response.type = "application/json";
    const distance = hDist(toPoint(start), toPoint(end));
    ctx.response.body = JSON.stringify({ start, end, distance });
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
}).use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const elapsed = performance.now() - start;
  ctx.response.headers.set("X-Response-Time", elapsed.toFixed(1));
}).use(async (_ctx, next) => {
  const startUsage = Deno.memoryUsage();
  await next();
  const endUsage = Deno.memoryUsage();
  const log = logger();
  log.info(`RSS Delta: ${bFormat(endUsage.rss - startUsage.rss)}`);
  log.info(
    `Heap Used Delta: ${bFormat(endUsage.heapUsed - startUsage.heapUsed)}`,
  );
  log.info("Memory Usage: ", endUsage);
}).use(r.routes()).use(r.allowedMethods());

app.addEventListener("listen", ({ hostname, port, secure }) => {
  const scheme = `http${secure ? "s" : ""}`;
  logger().info(
    `Listening on ${scheme}://${hostname ?? "localhost"}:${port}`,
  );
});

export { app };
