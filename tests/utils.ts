import { expect } from "bun:test";

import type { Result, ResultError, ResultSuccess } from "../src/result";

export function expectIsSuccess<T>(
	res: Result<T>,
	message?: string,
): asserts res is ResultSuccess<T> {
	expect(res.status, message).toBe("success");
}

export function expectIsFailure(
	res: Result<unknown>,
	message?: string,
): asserts res is ResultError {
	expect(res.status, message).toBe("error");
}
