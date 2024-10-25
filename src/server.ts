import { cors, Hono, STATUS_CODE } from "../deps.ts";
import { loadCountryData } from "./data.ts";
import { hDist } from "./distance.ts";
import { logger } from "./log.ts";
import { logMemory, normKey, toPoint } from "./utils.ts";
import { Alea, DEFAULT_URNG16 } from "./rand.ts";

const countryErrorString = (countryParam: string) =>
  `Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const countryApp = new Hono()
  .basePath(":country/")
  .get(
    "info/:code/",
    async (c) => {
      const { code, country } = c.req.param();
      const countryData = await loadCountryData(country);
      const codeInfo = countryData?.get(normKey(code));
      if (codeInfo) {
        return c.json(codeInfo);
      } else if (!countryData) {
        c.status(STATUS_CODE.BadRequest);
        return c.json({ error: [countryErrorString(country)] });
      } else {
        c.status(STATUS_CODE.BadRequest);
        return c.json({ error: [codeErrorString(code)] });
      }
    },
  )
  .get(
    "distance/:start/:end/",
    async (c) => {
      const { country, start, end } = c.req.param();
      const countryData = await loadCountryData(country);
      const startCode = normKey(start);
      const endCode = normKey(end);
      const startInfo = countryData?.get(startCode);
      const endInfo = countryData?.get(endCode);
      if (startInfo && endInfo) {
        const distance = hDist(toPoint(startInfo), toPoint(endInfo));
        return c.json({ start: startInfo, end: endInfo, distance });
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
        c.status(STATUS_CODE.BadRequest);
        return c.json({ error });
      }
    },
  ).get(
    "random/",
    async (c) => {
      const log = logger();
      const { country } = c.req.param();
      log.debug(`Country: ${country}`);
      const countryData = await loadCountryData(country);
      log.debug(`Country Data: ${countryData?.size}`);
      if (countryData) {
        const allCodes = [...countryData.keys()];
        const seed = c.req.query("seed") || DEFAULT_URNG16.value;
        log.debug("Seed:", seed);
        const idx = new Alea(String(seed)).uint32() % allCodes.length;
        log.debug("Index:", idx);
        const code = allCodes[idx];
        const codeInfo = countryData.get(code)!;
        return c.json(codeInfo);
      } else {
        c.status(STATUS_CODE.BadRequest);
        return c.json({ error: [countryErrorString(country)] });
      }
    },
  );

const app = new Hono()
  .use("*", async (ctx, next) => {
    const start = performance.now();
    await next();
    const elapsed = performance.now() - start;
    ctx.header("Server-Timing", `cpu;dur=${elapsed.toFixed(3)}`);
  })
  .use("*", cors())
  .use("*", async ({ req }, next) => {
    logger().info(`${req.method} ${req.url}`);
    await next();
  }).use("*", async (_ctx, next) => {
    const startUsage = Deno.memoryUsage();
    await next();
    const endMem = Deno.memoryUsage();
    queueMicrotask(() => logMemory(startUsage, endMem));
  })
  .route("/api/", countryApp)
  .get("/health/", (c) => c.json({ ready: true }));

export { app };
