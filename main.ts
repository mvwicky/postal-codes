import { getConfig } from "./src/config.ts";
import { logger } from "./src/log.ts";
import { app } from "./src/server/server.ts";

const { server } = await getConfig();

const s = Bun.serve({
	...server,
	fetch: app.fetch,
});

logger("server").info(`Listening on ${s.hostname}:${s.port}`);
