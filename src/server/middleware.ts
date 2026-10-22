import { logger } from "../log";
import { logMemory } from "../utils";

export type Handler<T extends string = string> = (
	req: Bun.BunRequest<T>,
) => Response | Promise<Response>;
export type Middleware<T extends string = string> = (
	next: Handler<T>,
) => Handler<T>;

export function timing<T extends string = string>(): Middleware<T> {
	return function timingMW<T extends string = string>(
		next: Handler<T>,
	): Handler<T> {
		return async (req: Bun.BunRequest<T>) => {
			const start = Bun.nanoseconds();
			const res = await next(req);
			const elapsed = Bun.nanoseconds() - start;
			res.headers.set("Server-Timing", `cpu;dur=${(elapsed / 1e6).toFixed(3)}`);
			return res;
		};
	};
}

export function cors<T extends string = string>(): Middleware<T> {
	return function corsMW<T extends string = string>(
		next: Handler<T>,
	): Handler<T> {
		return async (req: Bun.BunRequest<T>) => {
			const res = await next(req);
			res.headers.set("Access-Control-Allow-Origin", "*");
			return res;
		};
	};
}

export function logging<T extends string = string>(): Middleware<T> {
	return function loggingMW<T extends string = string>(
		next: Handler<T>,
	): Handler<T> {
		return async (req: Bun.BunRequest<T>) => {
			logger().info(`${req.method} ${req.url}`);
			return next(req);
		};
	};
}

export function memoryUsage<T extends string = string>(): Middleware<T> {
	return function memMW<T extends string = string>(
		next: Handler<T>,
	): Handler<T> {
		return async (req: Bun.BunRequest<T>) => {
			const start = process.memoryUsage();
			const res = await next(req);
			const end = process.memoryUsage();
			queueMicrotask(() => logMemory(start, end));
			return res;
		};
	};
}

export function apply<T extends string = string>(
	...mw: Middleware<T>[]
): Middleware<T> {
	return function manyMW(handler: Handler<T>): Handler<T> {
		for (const m of mw) {
			handler = m(handler);
		}
		return handler;
	};
}
