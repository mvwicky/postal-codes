import {
  crypto,
  readAll,
  toHashString,
  walk,
  type WalkOptions,
} from "./deps.ts";

async function readFile(path: string): Promise<Uint8Array> {
  const file = await Deno.open(path, { read: true });
  const contents = await readAll(file);
  file.close();
  return contents;
}

async function main() {
  const options: WalkOptions = {
    includeDirs: false,
    skip: [/node_modules/],
    exts: ["ts"],
  };
  let totalEntries = 0;
  const allEntries: string[] = [];
  for await (const entry of walk(".", options)) {
    allEntries.push(entry.path);
    totalEntries++;
  }
  allEntries.sort();
  const contents = await Promise.all(allEntries.map(readFile));
  const totalLength = contents.reduce((p, c) => p + c.length, 0);
  const totalContent = new Uint8Array(totalLength);
  let idx = 0;
  for (const elem of contents) {
    totalContent.set(elem, idx);
    idx += elem.length;
  }
  const digest = await crypto.subtle.digest(
    "FNV64A",
    totalContent,
  );
  const digestStr = toHashString(digest, "hex");
  console.log(totalEntries, digestStr);
}

if (import.meta.main) {
  await main();
}
