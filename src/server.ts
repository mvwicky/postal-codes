import * as oak from "oak";

import { type GeoName } from "./schemas.ts";
import { loadCountryData } from "./data.ts";
import { hDist } from "./distance.ts";
import { logger, setupLogging } from "./log.ts";

const data = new Map<string, Map<string, GeoName>>();

const cleanCode = (code: string) => code.toLocaleUpperCase();

const router = new oak.Router();
router.get("/info/:country/:code/", async (ctx) => {
  const country = ctx.params.country.toLocaleUpperCase();
  let countryData = data.get(country);
  if (!countryData) {
    const newData = await loadCountryData(country);
    if (newData) {
      data.set(country, newData);
      countryData = newData;
    }
  }
  const code = ctx.params.code.toLocaleUpperCase();
  const codeInfo = countryData?.get(code);
  if (codeInfo) {
    ctx.response.type = "application/json";
    ctx.response.body = JSON.stringify(codeInfo);
  }
}).get("/distance/:country/:start/:end/", async (ctx) => {
  const country = ctx.params.country.toLocaleUpperCase();
  let countryData = data.get(country);
  if (!countryData) {
    const newData = await loadCountryData(country);
    if (newData) {
      data.set(country, newData);
      countryData = newData;
    }
  }
  const start = cleanCode(ctx.params.start);
  const startInfo = countryData?.get(start);
  const end = cleanCode(ctx.params.end);
  const endInfo = countryData?.get(end);
  if (startInfo && endInfo) {
    ctx.response.type = "application/json";
    const distance = hDist([startInfo.latitude, startInfo.longitude], [
      endInfo.latitude,
      endInfo.longitude,
    ]);
    ctx.response.body = JSON.stringify({
      start: startInfo,
      end: endInfo,
      distance: distance,
    });
  }
});

const r = new oak.Router().use(
  "/api",
  router.routes(),
  router.allowedMethods(),
);
const app = new oak.Application();
app.use(r.routes());
app.use(r.allowedMethods());

app.addEventListener("listen", ({ hostname, port, secure }) => {
  setupLogging();
  logger().info(
    `Listening on http${secure ? "s" : ""}//${hostname ?? "localhost"}:${port}`,
  );
});
// await app.listen({ port: 8001 });
export { app };
