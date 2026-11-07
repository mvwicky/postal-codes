export type ResultSuccess<T> = { status: "success"; result: T };
export type ResultError<E = unknown> = { status: "error"; err: E };

export type Result<T> = ResultSuccess<T> | ResultError;

export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T>> {
	try {
		const result = await fn();
		return { status: "success", result };
	} catch (err: unknown) {
		return { status: "error", err };
	}
}

export async function safeExec<T>(
	fn: () => Promise<Result<T>>,
): Promise<Result<T>> {
	try {
		return await fn();
	} catch (err: unknown) {
		return { status: "error", err };
	}
}

export function newSuccess<T>(result: T): ResultSuccess<T> {
	return { status: "success", result };
}

export function newError<E>(err: E): ResultError<E> {
	return { status: "error", err };
}

export function isSuccess<T>(res: Result<T>): res is ResultSuccess<T> {
	return res.status === "success";
}

export function map<T, U>(res: Result<T>, op: (result: T) => U): Result<U> {
	return isSuccess(res) ? newSuccess(op(res.result)) : res;
}

export function mapOr<T, U>(res: Result<T>, def: U, op: (result: T) => U): U {
	return mapOrElse(res, () => def, op);
}

export function mapOrElse<T, U>(
	res: Result<T>,
	defn: (err: unknown) => U,
	op: (result: T) => U,
): U {
	return isSuccess(res) ? op(res.result) : defn(res.err);
}
