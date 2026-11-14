import type { Result } from "./result.ts";
import type { GeoName } from "./schemas.ts";

export interface PostalCodeData<GetInfoOptions, GetRandomOptions> {
	getInfo(
		country: string,
		code: string,
		options?: GetInfoOptions,
	): Promise<Result<GeoName>>;

	getRandom(
		country: string,
		seed?: string | number | string[],
		options?: GetRandomOptions,
	): Promise<Result<GeoName>>;
}
