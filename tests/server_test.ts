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
  await t.step("US", async () => {
    const req = createRequest("/api/US/random/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    GeoNameSchema.parse(data);
  });
  await t.step("CA", async () => {
    const req = createRequest("/api/CA/random/");
    const res = await app.request(req);
    genericCheckResponse(res);
    const data = await res.json();
    GeoNameSchema.parse(data);
  });
});

Deno.test("health check route", {}, async () => {
  const req = createRequest("/health/");
  const res = await app.request(req);
  genericCheckResponse(res);
  const data = await res.json();
  assert(data.ready);
});
