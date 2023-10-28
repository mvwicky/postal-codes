import { assert, assertEquals } from "../dev_deps.ts";
import { Status } from "../deps.ts";
import { app } from "../src/server.ts";

Deno.test("random route", {}, async (t) => {
  await t.step("US", async () => {
    const req = new Request("http://localhost:8000/api/US/random/");
    const res = await app.handle(req);
    assert(res);
    assertEquals(res.status, Status.OK);
  });
  await t.step("CA", async () => {
    const req = new Request("http://localhost:8000/api/CA/random/");
    const res = await app.handle(req);
    assert(res);
    assertEquals(res.status, Status.OK);
  });
});

Deno.test("health check route", {}, async () => {
  const req = new Request("http://localhost:8000/health/");
  const res = await app.handle(req);
  assert(res);
  assertEquals(res.status, Status.OK);
  const data = await res.json();
  assert(data.ready);
});
