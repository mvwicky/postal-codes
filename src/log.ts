import { type ConsolaInstance, createConsola } from "consola/core";

let _log: ConsolaInstance | undefined;

export function logger(tag?: string): ConsolaInstance {
	if (!_log) {
		_log = createConsola({});
	}
	return tag ? _log.withTag(tag) : _log;
}
