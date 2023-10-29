import { assert, assertEquals } from "../dev_deps.ts";
import { Status } from "../deps.ts";
import { app } from "../src/server.ts";
import { GeoNameSchema } from "../src/schemas.ts";

Deno.test("info route", {}, async (t) => {
  await t.step("US", async () => {
    const req = new Request("http://localhost:8000/api/US/info/93109/");
    const res = await app.request(req);
    assertEquals(res.status, Status.OK);
    const data = await res.json();
    const geoData = GeoNameSchema.parse(data);
    assertEquals(geoData.admin_code_1, "CA");
    assertEquals(geoData.place_name, "Santa Barbara");
  });
  await t.step("CA", async () => {
    const req = new Request("http://localhost:8000/api/CA/info/V1T/");
    const res = await app.request(req);
    assertEquals(res.status, Status.OK);
    const data = await res.json();
    const geoData = GeoNameSchema.parse(data);
    assertEquals(geoData.admin_code_1, "BC");
    assertEquals(geoData.place_name, "Vernon Central");
  });
});

Deno.test("random route", {}, async (t) => {
  await t.step("US", async () => {
    const req = new Request("http://localhost:8000/api/US/random/");
    const res = await app.request(req);
    assertEquals(res.status, Status.OK);
    const data = await res.json();
    GeoNameSchema.parse(data);
  });
  await t.step("CA", async () => {
    const req = new Request("http://localhost:8000/api/CA/random/");
    const res = await app.request(req);
    assertEquals(res.status, Status.OK);
    const data = await res.json();
    GeoNameSchema.parse(data);
  });
});

Deno.test("health check route", {}, async () => {
  const req = new Request("http://localhost:8000/health/");
  const res = await app.request(req);
  assertEquals(res.status, Status.OK);
  const data = await res.json();
  assert(data.ready);
});
