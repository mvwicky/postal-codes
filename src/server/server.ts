import type { Config } from "../config";
import { loadCountryData } from "../data";
import { hDist } from "../distance";
import { logger } from "../log";
import { Alea, DEFAULT_URNG16 } from "../rand";
import { normKey, toPoint } from "../utils";
import { apply, cors, type Handler, logging, timing } from "./middleware";
import { STATUS_CODE } from "./status";

type CountryRoute = `${string}/:country/${string}`;
type InfoRoute = `${CountryRoute}/:code/${string}`;
type DistanceRoute = `${CountryRoute}/:start/${string}/:end/${string}`;

const countryErrorString = (countryParam: string) =>
	`Unknown country: ${countryParam}`;

const codeErrorString = (codeParam: string) => `Invalid code: ${codeParam}`;

const errorResponse = (
	error: string[],
	code: number = STATUS_CODE.BadRequest,
) => Response.json({ error }, code);

const infoHandler = async (req: Bun.BunRequest<InfoRoute>) => {
	const { code, country } = req.params;
	const countryData = await loadCountryData(country);
	const codeInfo = countryData?.get(normKey(code));
	if (codeInfo) {
		return Response.json(codeInfo);
	} else if (!countryData) {
		return errorResponse([countryErrorString(country)]);
	} else {
		return errorResponse([codeErrorString(code)]);
	}
};

const distanceHandler = async (req: Bun.BunRequest<DistanceRoute>) => {
	const { country, start, end } = req.params;
	const countryData = await loadCountryData(country);
	const startCode = normKey(start);
	const endCode = normKey(end);
	const startInfo = countryData?.get(startCode);
	const endInfo = countryData?.get(endCode);
	if (startInfo && endInfo) {
		const distance = hDist(toPoint(startInfo), toPoint(endInfo));
		return Response.json({ start: startInfo, end: endInfo, distance });
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
		return errorResponse(error);
	}
};

const randomHandler = async (req: Bun.BunRequest<CountryRoute>) => {
	const log = logger();
	const { country } = req.params;
	log.debug(`Country: ${country}`);
	const countryData = await loadCountryData(country);
	log.debug(`Country Data: ${countryData?.size}`);
	if (countryData) {
		const allCodes = [...countryData.keys()];
		const seed =
			new URL(req.url).searchParams.get("seed") || DEFAULT_URNG16.value;
		log.debug("Seed:", seed);
		const idx = new Alea(String(seed)).uint32() % allCodes.length;
		log.debug("Index:", idx);
		const code = allCodes[idx];
		if (!code) {
			return errorResponse(["Unable to get code."], STATUS_CODE.ServerError);
		}
		const codeInfo = countryData.get(code);
		return Response.json(codeInfo);
	} else {
		return errorResponse([countryErrorString(country)]);
	}
};

const defaultMW = <T extends string>(handler: Handler<T>) =>
	apply<T>(logging(), cors(), timing())(handler);

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
