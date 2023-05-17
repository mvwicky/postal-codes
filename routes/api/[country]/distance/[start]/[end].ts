import { HandlerContext } from "~/deps.ts";
import { loadCountryData } from "~/src/data.ts";
import { hDist } from "~/src/distance.ts";
import { normKey, toPoint } from "~/src/utils.ts";

export const handler = async (
  _req: Request,
  { params }: HandlerContext,
): Promise<Response> => {
  const startCode = normKey(params.start);
  const endCode = normKey(params.end);
  const country = normKey(params.country);
  const data = await loadCountryData(country);
  const start = data?.get(startCode);
  const end = data?.get(endCode);
  if (start && end) {
    const distance = hDist(toPoint(start), toPoint(end));
    const body = JSON.stringify({ start, end, distance });
    return new Response(body, {
      headers: [["Content-Type", "application/json"]],
    });
  }
  return new Response(`Not Found`, { status: 404 });
};
