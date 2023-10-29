import { getConfig } from "./src/config.ts";
import { app } from "./src/server.ts";
import { logger } from "./src/log.ts";

const { server } = await getConfig();

Deno.serve({
  ...server,
  onListen: ({ hostname, port }) => {
    logger().info(`Listening on ${hostname}:${port}`);
  },
}, app.fetch);
