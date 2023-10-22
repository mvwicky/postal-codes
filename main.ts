import { getConfig } from "./src/config.ts";
import { app } from "./src/server.ts";

const { server: { port, hostname } } = await getConfig();

await app.listen({ port, hostname });
