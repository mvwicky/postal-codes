import * as csv from "std/csv/mod.ts";

import { logger } from "./log.ts";
import { type ZIPEntry, ZIPEntrySchema } from "./zip_code.ts";

function toZIPEntry(inp: Record<string, unknown>): ZIPEntry | null {
  const result = ZIPEntrySchema.safeParse(inp);
  if (result.success) {
    return result.data;
  } else {
    logger().debug(`parse failed: ${result.error}`);
    return null;
  }
}

async function loadZIPs(filePath: string): Promise<Map<string, ZIPEntry>> {
  const entryMap = new Map<string, ZIPEntry>();
  const file = await Deno.open(filePath, { read: true });
  const rows = file.readable
    .pipeThrough(new TextDecoderStream("utf-8"))
    .pipeThrough(new csv.CsvParseStream({ skipFirstRow: true }));
  let [total, failed] = [0, 0];
  for await (const elem of rows) {
    total += 1;
    const entry = toZIPEntry(elem);
    if (entry) {
      entryMap.set(entry.zip, entry);
    } else {
      failed += 1;
    }
  }
  logger().info(`${failed} failures out of ${total} total rows`);
  return entryMap;
}

export { loadZIPs, toZIPEntry };
