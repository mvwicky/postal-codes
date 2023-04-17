import * as log from "std/log/mod.ts";

export function logger() {
  return log.getLogger("postal-codes");
}

export async function setupLogging() {
  await log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler("INFO"),
      file: new log.handlers.RotatingFileHandler("DEBUG", {
        filename: "logs/log.log",
        maxBytes: 10485760,
        maxBackupCount: 5,
      }),
    },
    loggers: {
      "postal-codes": { level: "DEBUG", handlers: ["file", "console"] },
    },
  });
}
