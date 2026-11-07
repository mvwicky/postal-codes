import type { Result } from "./result";
import type { GeoName } from "./schemas";

export interface PostalCodeData<GetInfoOptions> {
	getInfo(
		country: string,
		code: string,
		options?: GetInfoOptions,
	): Promise<Result<GeoName>>;

	getRandom(
		country: string,
		options?: GetInfoOptions,
	): Promise<Result<GeoName>>;
}
