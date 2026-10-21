import { describe, expect, test } from "bun:test";

import { z } from "zod";

import { ErrorResponseSchema, GeoNameSchema } from "../src/schemas.ts";
import { app } from "../src/server/server.ts";
import { STATUS_CODE } from "../src/server/status.ts";

const DistanceResSchema = z.object({
	start: GeoNameSchema,
	end: GeoNameSchema,
	distance: z.number(),
});

function getResponse(path: string) {
	return app.request(new Request(`http://localhost:8000${path}`));
}

function genericCheckResponse({ status, headers }: Response) {
	expect(status, "Expected OK").toEqual(STATUS_CODE.OK);
	expect(headers.get("access-control-allow-origin")).toEqual("*");
	expect(headers.get("server-timing")).not.toBeNull();
}

// biome-ignore lint/suspicious/noExplicitAny: Don't care
async function checkMatches<T extends z.ZodObject<any, any>>(
	res: Response,
	schema: T,
): Promise<z.infer<T>> {
	const data = await res.json();
	return schema.parse(data);
}

describe("info route", async () => {
	test("US", async () => {
		const res = await getResponse("/api/US/info/93109/");
		genericCheckResponse(res);
		const geoData = await checkMatches(res, GeoNameSchema);

		expect(geoData.admin_code_1).toEqual("CA");
		expect(geoData.place_name).toEqual("Santa Barbara");
	});
	test("CA", async () => {
		const res = await getResponse("/api/CA/info/V1T/");
		genericCheckResponse(res);
		const geoData = await checkMatches(res, GeoNameSchema);
		expect(geoData.admin_code_1).toEqual("BC");
		expect(geoData.place_name).toEqual("Vernon Central");
	});
});

test("info route bad country", async () => {
	const res = await getResponse("/api/AB/info/93109/");
	expect(res.status).toEqual(STATUS_CODE.BadRequest);
	const resData = await checkMatches(res, ErrorResponseSchema);
	expect(resData.error.length).toEqual(1);
});

describe("info route bad code", async () => {
	test("US", async () => {
		const res = await getResponse("/api/US/info/ABCDEF/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
	test("CA", async () => {
		const res = await getResponse("/api/CA/info/ABCDEF/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
});

describe("distance route", async () => {
	test("US", async () => {
		const res = await getResponse("/api/US/distance/93109/02119/");
		genericCheckResponse(res);
		await checkMatches(res, DistanceResSchema);
	});
	test("CA", async () => {
		const res = await getResponse("/api/CA/distance/V1T/V1A/");
		genericCheckResponse(res);
		await checkMatches(res, DistanceResSchema);
	});
});

test("distance route bad country", async () => {
	const res = await getResponse("/api/AB/distance/93109/02119/");
	expect(res.status).toEqual(STATUS_CODE.BadRequest);
	const resData = await checkMatches(res, ErrorResponseSchema);
	expect(resData.error.length).toEqual(1);
});

describe("distance route bad codes", async () => {
	test("US one bad code", async () => {
		const res = await getResponse("/api/US/distance/ABCDEF/93109/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
	test("US two bad codes", async () => {
		const res = await getResponse("/api/US/distance/ABCDEF/GHIJKL/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(2);
	});
	test("CA one bad code", async () => {
		const res = await getResponse("/api/CA/distance/ABCDEF/T0A/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
	test("CA two bad codes", async () => {
		const res = await getResponse("/api/CA/distance/ABCDEF/GHIJKL/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(2);
	});
});

test("random route US no seed", async () => {
	const res1 = await getResponse("/api/US/random/");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("US");
});

test("random route US with same seed", async () => {
	const res1 = await getResponse("/api/US/random/?seed=1234");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("US");
	const res2 = await getResponse("/api/US/random/?seed=1234");
	genericCheckResponse(res2);
	const code2 = await checkMatches(res2, GeoNameSchema);
	expect(code2.country_code).toEqual("US");
	expect(code1.postal_code).toEqual(code2.postal_code);
});

test("random route US with different seed", async () => {
	const res1 = await getResponse("/api/US/random/?seed=1234");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("US");
	const res2 = await getResponse("/api/US/random/?seed=ABCD");
	genericCheckResponse(res2);
	const code2 = await checkMatches(res2, GeoNameSchema);
	expect(code2.country_code).toEqual("US");
	expect(code1.postal_code).not.toEqual(code2.postal_code);
});

test("random route CA no seed", async () => {
	const res1 = await getResponse("/api/CA/random/");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("CA");
});

test("random route CA with same seed", async () => {
	const res1 = await getResponse("/api/CA/random/?seed=1234");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("CA");
	const res2 = await getResponse("/api/CA/random/?seed=1234");
	genericCheckResponse(res2);
	const code2 = await checkMatches(res2, GeoNameSchema);
	expect(code2.country_code).toEqual("CA");
	expect(code1.postal_code).toEqual(code2.postal_code);
});

test("random route CA with different seed", async () => {
	const res1 = await getResponse("/api/CA/random/?seed=1234");
	genericCheckResponse(res1);
	const code1 = await checkMatches(res1, GeoNameSchema);
	expect(code1.country_code).toEqual("CA");
	const res2 = await getResponse("/api/CA/random/?seed=ABCD");
	genericCheckResponse(res2);
	const code2 = await checkMatches(res2, GeoNameSchema);
	expect(code2.country_code).toEqual("CA");
	expect(code1.postal_code).not.toEqual(code2.postal_code);
});

test("random route bad country", async () => {
	const res = await getResponse("/api/AB/random/");
	expect(res.status).toEqual(STATUS_CODE.BadRequest);
	const resData = await checkMatches(res, ErrorResponseSchema);
	expect(resData.error.length).toEqual(1);
});

test("health check route", async () => {
	const HealthSchema = z.object({
		ready: z.boolean(),
	});
	const res = await getResponse("/health/");
	genericCheckResponse(res);
	const d = await checkMatches(res, HealthSchema);
	expect(d.ready).toBeTrue();
});
