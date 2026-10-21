import { getConfig } from "./src/config.ts";
import { logger } from "./src/log.ts";
import { createServer } from "./src/server/server.ts";

const config = await getConfig();

const s = createServer(config);
logger("server").info(`Listening on ${s.hostname}:${s.port}`);
