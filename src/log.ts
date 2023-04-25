import { type ConsolaInstance, createConsola } from "../deps.ts";

let _log: ConsolaInstance | undefined;

export function logger(): ConsolaInstance {
  if (!_log) {
    _log = createConsola({});
  }
  return _log;
}
