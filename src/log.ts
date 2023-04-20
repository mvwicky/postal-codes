import { log } from "../deps.ts";

export function logger() {
  return log.getLogger("postal-codes");
}

export function setupLogging() {
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler("INFO"),
      // file: new log.handlers.RotatingFileHandler("DEBUG", {
      //   filename: "logs/log.log",
      //   maxBytes: 10485760,
      //   maxBackupCount: 5,
      // }),
    },
    loggers: {
      "postal-codes": { level: "DEBUG", handlers: [/* "file",*/ "console"] },
    },
  });
}
