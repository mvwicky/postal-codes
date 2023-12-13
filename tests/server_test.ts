import { assert, assertEquals } from "../dev_deps.ts";
import { Status } from "../deps.ts";
import { app } from "../src/server.ts";
import { GeoNameSchema } from "../src/schemas.ts";

function createRequest(path: string) {
  return new Request(`http://localhost:8000${path}`);
}

function genericCheckResponse({ status, headers }: Response) {
  assertEquals(status, Status.OK);
  assertEquals(headers.get("access-control-allow-origin"), "*");
  assert(headers.get("server-timing"));
}

Deno.test("info route", {}, async (t) => {
  await t.step("US", async () => {
    const req = createRequest("/api/US/info/93109/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    const geoData = GeoNameSchema.parse(data);
    assertEquals(geoData.admin_code_1, "CA");
    assertEquals(geoData.place_name, "Santa Barbara");
  });
  await t.step("CA", async () => {
    const req = createRequest("/api/CA/info/V1T/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    const geoData = GeoNameSchema.parse(data);
    assertEquals(geoData.admin_code_1, "BC");
    assertEquals(geoData.place_name, "Vernon Central");
  });
});

Deno.test("distance route", {}, async (t) => {
  await t.step("US", async () => {
    const req = createRequest("/api/US/distance/93109/02119/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    GeoNameSchema.parse(data.start);
    GeoNameSchema.parse(data.end);
    assert(typeof data.distance === "number");
  });
  await t.step("CA", async () => {
    const req = createRequest("/api/CA/distance/V1T/V1A/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    GeoNameSchema.parse(data.start);
    GeoNameSchema.parse(data.end);
    assert(typeof data.distance === "number");
  });
});

Deno.test("random route", {}, async (t) => {
  await t.step("US no seed", async () => {
    const req = createRequest("/api/US/random/");
    const res1 = await app.request(req);
    genericCheckResponse(res1);
    const data1 = await res1.json();
    const code1 = GeoNameSchema.parse(data1);
    assertEquals(code1.country_code, "US");
  });
  await t.step("US with seed", async () => {
    const req = createRequest("/api/US/random/?seed=1234");
    const res1 = await app.request(req);
    genericCheckResponse(res1);
    const data1 = await res1.json();
    const code1 = GeoNameSchema.parse(data1);
    assertEquals(code1.country_code, "US");
    const res2 = await app.request(req);
    genericCheckResponse(res2);
    const data2 = await res2.json();
    const code2 = GeoNameSchema.parse(data2);
    assertEquals(code2.country_code, "US");
    assertEquals(code1.postal_code, code2.postal_code);
  });
  await t.step("CA no seed", async () => {
    const req = createRequest("/api/CA/random/");
    const res1 = await app.request(req);
    genericCheckResponse(res1);
    const data1 = await res1.json();
    const code1 = GeoNameSchema.parse(data1);
    assertEquals(code1.country_code, "CA");
  });
  await t.step("CA with seed", async () => {
    const req = createRequest("/api/CA/random/?seed=1234");
    const res1 = await app.request(req);
    genericCheckResponse(res1);
    const data1 = await res1.json();
    const code1 = GeoNameSchema.parse(data1);
    assertEquals(code1.country_code, "CA");
    const res2 = await app.request(req);
    genericCheckResponse(res2);
    const data2 = await res2.json();
    const code2 = GeoNameSchema.parse(data2);
    assertEquals(code2.country_code, "CA");
    assertEquals(code1.postal_code, code2.postal_code);
  });
});

Deno.test("health check route", {}, async () => {
  const req = createRequest("/health/");
  const res = await app.request(req);
  genericCheckResponse(res);
  const data = await res.json();
  assert(data.ready);
});
