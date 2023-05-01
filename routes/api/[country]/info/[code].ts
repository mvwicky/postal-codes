import { HandlerContext } from "~/deps.ts";
import { loadCountryData } from "~/src/data.ts";
import { normKey } from "~/src/utils.ts";

export const handler = async (
  _req: Request,
  { params }: HandlerContext,
): Promise<Response> => {
  const country = normKey(params.country);
  const code = normKey(params.code);
  const data = await loadCountryData(country);
  const info = data?.get(code);
  if (info) {
    return new Response(JSON.stringify(info), {
      headers: [["Content-Type", "application/json"]],
    });
  }
  return new Response(`Code not found ${code} (${country})`, {
    status: 404,
  });
};
