import type { Config } from "../config.ts";
import { loadCountryData } from "../data.ts";
import { hDist } from "../distance.ts";
import { logger } from "../log.ts";
import { Alea, DEFAULT_URNG16 } from "../rand.ts";
import { mapOrElse } from "../result.ts";
import { normKey, toPoint } from "../utils.ts";
import * as mw from "./middleware.ts";
import { STATUS_CODE } from "./status.ts";

type CountryRoute = `${string}/:country/${string}`;
type InfoRoute = `${CountryRoute}/:code/${string}`;
type DistanceRoute = `${CountryRoute}/:start/${string}/:end/${string}`;

const countryErrorString = (countryParam: string) =>
	`Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const errorResponse = (
	error: string | string[],
	code: number = STATUS_CODE.BadRequest,
) =>
	Response.json(
		{ error: Array.isArray(error) ? error : [error] },
		{ status: code },
	);

const infoHandler = async (req: Bun.BunRequest<InfoRoute>) => {
	const { code, country } = req.params;
	const res = await loadCountryData(country);
	return mapOrElse(
		res,
		() => errorResponse(countryErrorString(country)),
		(countryData) => {
			const codeInfo = countryData.get(normKey(code));
			if (codeInfo) {
				return Response.json(codeInfo);
			} else {
				return errorResponse(codeErrorString(code));
			}
		},
	);
};

const distanceHandler = async (req: Bun.BunRequest<DistanceRoute>) => {
	const { country, start, end } = req.params;
	const res = await loadCountryData(country);
	return mapOrElse(
		res,
		() => errorResponse(countryErrorString(country)),
		(countryData) => {
			const startCode = normKey(start);
			const endCode = normKey(end);
			const startInfo = countryData.get(startCode);
			const endInfo = countryData.get(endCode);
			if (startInfo && endInfo) {
				const distance = hDist(toPoint(startInfo), toPoint(endInfo));
				return Response.json({ start: startInfo, end: endInfo, distance });
			} else {
				const error: string[] = [];
				if (countryData && !startInfo) {
					error.push(codeErrorString(start));
				}
				if (countryData && !endInfo) {
					error.push(codeErrorString(end));
				}
				return errorResponse(error);
			}
		},
	);
};

const randomHandler = async (req: Bun.BunRequest<CountryRoute>) => {
	const log = logger();
	const { country } = req.params;
	log.debug(`Country: ${country}`);
	const res = await loadCountryData(country);
	return mapOrElse(
		res,
		() => errorResponse(countryErrorString(country)),
		(countryData) => {
			log.debug(`Country Data: ${countryData?.size}`);
			const allCodes = [...countryData.keys()];
			const seed =
				new URL(req.url).searchParams.get("seed") || DEFAULT_URNG16.value;
			log.debug("Seed:", seed);
			const idx = new Alea(String(seed)).uint32() % allCodes.length;
			log.debug("Index:", idx);
			const code = allCodes[idx];
			if (!code) {
				return errorResponse("Unable to get code.", STATUS_CODE.ServerError);
			}
			const codeInfo = countryData.get(code);
			return Response.json(codeInfo);
		},
	);
};

const defaultMW = <T extends string>(handler: mw.Handler<T>) =>
	mw.apply<T>(mw.logging(), mw.cors(), mw.memoryUsage(), mw.timing())(handler);

export const createServer = (config: Config) =>
	Bun.serve({
		...config.server,
		development: import.meta.env.NODE_ENV === "development",
		routes: {
			"/api/:country/info/:code/": {
				GET: defaultMW(infoHandler),
			},
			"/api/:country/distance/:start/:end/": {
				GET: defaultMW(distanceHandler),
			},
			"/api/:country/random/": {
				GET: defaultMW(randomHandler),
			},
			"/health/": {
				GET: defaultMW(() => Response.json({ ready: true })),
			},
		},
	});
