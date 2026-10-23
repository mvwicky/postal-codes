import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { z } from "zod";

import { getConfig } from "../src/config.ts";
import { ErrorResponseSchema, GeoNameSchema } from "../src/schemas.ts";
import { createServer } from "../src/server/server.ts";
import { STATUS_CODE } from "../src/server/status.ts";

const HealthSchema = z.object({
	ready: z.literal(true),
});
const DistanceResSchema = z.object({
	start: GeoNameSchema,
	end: GeoNameSchema,
	distance: z.number(),
});

let server!: Bun.Server<unknown>;

function getResponse(path: string): Promise<Response> {
	const url = `http://${server.hostname}:${server.port}${path}`;
	return fetch(url);
}

function genericCheckResponse({ status, headers }: Response) {
	expect(status, "Expected OK").toEqual(STATUS_CODE.OK);
	expect(
		headers.get("access-control-allow-origin"),
		"CORS header not found.",
	).toEqual("*");
	expect(
		headers.get("server-timing"),
		"server-timing header not found",
	).not.toBeNull();
}

// biome-ignore lint/suspicious/noExplicitAny: Don't care
async function checkMatches<T extends z.ZodObject<any, any>>(
	res: Response,
	schema: T,
): Promise<z.infer<T>> {
	const data = await res.json();
	return schema.parse(data);
}

beforeAll(async () => {
	const config = await getConfig();
	server = createServer(config);
});
afterAll(async () => {
	await server.stop();
});

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

	describe("bad code", async () => {
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

	test("bad country", async () => {
		const res = await getResponse("/api/AB/info/93109/");
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

	describe("bad codes", async () => {
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

	test("bad country", async () => {
		const res = await getResponse("/api/AB/distance/93109/02119/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
});

describe("random route", async () => {
	test("US no seed", async () => {
		const res1 = await getResponse("/api/US/random/");
		genericCheckResponse(res1);
		const code1 = await checkMatches(res1, GeoNameSchema);
		expect(code1.country_code).toEqual("US");
	});

	test("US with same seed", async () => {
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

	test("US with different seed", async () => {
		const seed = String.fromCharCode(0xd801) + String.fromCharCode(0xdc001);
		const res1 = await getResponse(`/api/US/random/?seed=${seed}`);
		genericCheckResponse(res1);
		const code1 = await checkMatches(res1, GeoNameSchema);
		expect(code1.country_code).toEqual("US");
		const res2 = await getResponse("/api/US/random/?seed=ABCD");
		genericCheckResponse(res2);
		const code2 = await checkMatches(res2, GeoNameSchema);
		expect(code2.country_code).toEqual("US");
		expect(code1.postal_code).not.toEqual(code2.postal_code);
	});

	test("CA no seed", async () => {
		const res1 = await getResponse("/api/CA/random/");
		genericCheckResponse(res1);
		const code1 = await checkMatches(res1, GeoNameSchema);
		expect(code1.country_code).toEqual("CA");
	});

	test("CA with same seed", async () => {
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

	test("CA with different seed", async () => {
		const seed = String.fromCharCode(0xd801) + String.fromCharCode(0xdc00);
		const res1 = await getResponse(`/api/CA/random/?seed=${seed}`);
		genericCheckResponse(res1);
		const code1 = await checkMatches(res1, GeoNameSchema);
		expect(code1.country_code).toEqual("CA");
		const res2 = await getResponse("/api/CA/random/?seed=ABCD");
		genericCheckResponse(res2);
		const code2 = await checkMatches(res2, GeoNameSchema);
		expect(code2.country_code).toEqual("CA");
		expect(code1.postal_code).not.toEqual(code2.postal_code);
	});

	test("bad country", async () => {
		const res = await getResponse("/api/AB/random/");
		expect(res.status).toEqual(STATUS_CODE.BadRequest);
		const resData = await checkMatches(res, ErrorResponseSchema);
		expect(resData.error.length).toEqual(1);
	});
});

test("health check route", async () => {
	const res = await getResponse("/health/");
	genericCheckResponse(res);
	const d = await checkMatches(res, HealthSchema);
	expect(d.ready).toBeTrue();
});
