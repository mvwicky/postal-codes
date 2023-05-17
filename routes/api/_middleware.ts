import { MiddlewareHandlerContext } from "~/deps.ts";
import { logger } from "~/src/log.ts";

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  logger().info(`${req.method} - ${req.url}`);
  const resp = await ctx.next();
  return resp;
}
