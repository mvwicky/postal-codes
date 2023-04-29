import { HandlerContext } from "$fresh/server.ts";
import { normKey } from "../../../../src/utils.ts";
normKey;

export const handler = (
  _req: Request,
  { params }: HandlerContext,
): Response => {
  const code = normKey(params.code);
  const country = normKey(params.country);
  return new Response(`${JSON.stringify({ code, country })}`, {
    headers: [["Content-Type", "application/json"]],
  });
};
