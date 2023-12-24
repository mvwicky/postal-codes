import { z } from "../deps.ts";
import { assert, assertEquals, assertNotEquals } from "../dev_deps.ts";
import { STATUS_CODE } from "../deps.ts";
import { app } from "../src/server.ts";
import { ErrorResponseSchema, GeoNameSchema } from "../src/schemas.ts";

const DistanceResSchema = z.object({
  start: GeoNameSchema,
  end: GeoNameSchema,
  distance: z.number(),
});

function getResponse(path: string) {
  return app.request(new Request(`http://localhost:8000${path}`));
}

function genericCheckResponse({ status, headers }: Response) {
  assertEquals(status, STATUS_CODE.OK, "Expected OK");
  assertEquals(headers.get("access-control-allow-origin"), "*");
  assert(headers.get("server-timing"));
}

// deno-lint-ignore no-explicit-any
async function checkMatches<T extends z.ZodObject<any, any, any>>(
  res: Response,
  schema: T,
): Promise<z.infer<T>> {
  const data = await res.json();
  return schema.parse(data);
}

Deno.test("info route", {}, async (t) => {
  await t.step("US", async () => {
    const res = await getResponse("/api/US/info/93109/");
    genericCheckResponse(res);
    const geoData = await checkMatches(res, GeoNameSchema);
    assertEquals(geoData.admin_code_1, "CA");
    assertEquals(geoData.place_name, "Santa Barbara");
  });
  await t.step("CA", async () => {
    const res = await getResponse("/api/CA/info/V1T/");
    genericCheckResponse(res);
    const geoData = await checkMatches(res, GeoNameSchema);
    assertEquals(geoData.admin_code_1, "BC");
    assertEquals(geoData.place_name, "Vernon Central");
  });
});

Deno.test("info route bad country", {}, async () => {
  const res = await getResponse("/api/AB/info/93109/");
  assertEquals(res.status, STATUS_CODE.BadRequest);
  const resData = await checkMatches(res, ErrorResponseSchema);
  assertEquals(resData.error.length, 1);
});

Deno.test("info route bad code", {}, async (t) => {
  await t.step("US", async () => {
    const res = await getResponse("/api/US/info/ABCDEF/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    assertEquals(resData.error.length, 1);
  });
  await t.step("CA", async () => {
    const res = await getResponse("/api/CA/info/ABCDEF/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    assertEquals(resData.error.length, 1);
  });
});

Deno.test("distance route", {}, async (t) => {
  await t.step("US", async () => {
    const res = await getResponse("/api/US/distance/93109/02119/");
    genericCheckResponse(res);
    await checkMatches(res, DistanceResSchema);
  });
  await t.step("CA", async () => {
    const res = await getResponse("/api/CA/distance/V1T/V1A/");
    genericCheckResponse(res);
    await checkMatches(res, DistanceResSchema);
  });
});

Deno.test("distance route bad country", {}, async () => {
  const res = await getResponse("/api/AB/distance/93109/02119/");
  assertEquals(res.status, STATUS_CODE.BadRequest);
  const resData = await checkMatches(res, ErrorResponseSchema);
  assertEquals(resData.error.length, 1);
});

Deno.test("distance route bad codes", {}, async (t) => {
  await t.step("US one bad code", async () => {
    const res = await getResponse("/api/US/distance/ABCDEF/93109/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    assertEquals(resData.error.length, 1);
  });
  await t.step("US two bad codes", async () => {
    const res = await getResponse("/api/US/distance/ABCDEF/GHIJKL/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    assertEquals(resData.error.length, 2);
  });
  await t.step("CA one bad code", async () => {
    const res = await getResponse("/api/CA/distance/ABCDEF/T0A/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    assertEquals(resData.error.length, 1);
  });
  await t.step("CA two bad codes", async () => {
    const res = await getResponse("/api/CA/distance/ABCDEF/GHIJKL/");
    assertEquals(res.status, STATUS_CODE.BadRequest);
    const resData = await checkMatches(res, ErrorResponseSchema);
    // assertEquals(resData.error.length, 2);
  });
});

Deno.test("random route US no seed", {}, async () => {
  const res1 = await getResponse("/api/US/random/");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "US");
});

Deno.test("random route US with same seed", {}, async () => {
  const res1 = await getResponse("/api/US/random/?seed=1234");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "US");
  const res2 = await getResponse("/api/US/random/?seed=1234");
  genericCheckResponse(res2);
  const code2 = await checkMatches(res2, GeoNameSchema);
  assertEquals(code2.country_code, "US");
  assertEquals(code1.postal_code, code2.postal_code);
});

Deno.test("random route US with different seed", {}, async () => {
  const res1 = await getResponse("/api/US/random/?seed=1234");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "US");
  const res2 = await getResponse("/api/US/random/?seed=ABCD");
  genericCheckResponse(res2);
  const code2 = await checkMatches(res2, GeoNameSchema);
  assertEquals(code2.country_code, "US");
  assertNotEquals(code1.postal_code, code2.postal_code);
});

Deno.test("random route CA no seed", {}, async () => {
  const res1 = await getResponse("/api/CA/random/");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "CA");
});

Deno.test("random route CA with same seed", {}, async () => {
  const res1 = await getResponse("/api/CA/random/?seed=1234");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "CA");
  const res2 = await getResponse("/api/CA/random/?seed=1234");
  genericCheckResponse(res2);
  const code2 = await checkMatches(res2, GeoNameSchema);
  assertEquals(code2.country_code, "CA");
  assertEquals(code1.postal_code, code2.postal_code);
});

Deno.test("random route CA with different seed", {}, async () => {
  const res1 = await getResponse("/api/CA/random/?seed=1234");
  genericCheckResponse(res1);
  const code1 = await checkMatches(res1, GeoNameSchema);
  assertEquals(code1.country_code, "CA");
  const res2 = await getResponse("/api/CA/random/?seed=ABCD");
  genericCheckResponse(res2);
  const code2 = await checkMatches(res2, GeoNameSchema);
  assertEquals(code2.country_code, "CA");
  assertNotEquals(code1.postal_code, code2.postal_code);
});

Deno.test("random route bad country", {}, async () => {
  const res = await getResponse("/api/AB/random/");
  assertEquals(res.status, STATUS_CODE.BadRequest);
  const resData = await checkMatches(res, ErrorResponseSchema);
  assertEquals(resData.error.length, 1);
});

Deno.test("health check route", {}, async () => {
  const res = await getResponse("/health/");
  genericCheckResponse(res);
  const data = await res.json();
  assert(data.ready);
});
