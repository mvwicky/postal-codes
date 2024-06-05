import { z } from "../deps.ts";
import { chunk, redis } from "../deps.ts";
import { type GeoName, GeoNameSchema } from "./schemas.ts";
import { normKey } from "./utils.ts";

const PREFIX = "postal-codes";
const VERSION = 1;
const KEY_PREFIX = `${PREFIX}:${VERSION}`;

let _db: redis.Redis | null = null;

async function getDB(): Promise<redis.Redis> {
  if (!_db || _db.isClosed) {
    const dbURL = Deno.env.get("REDIS_URL") ?? "redis://127.0.0.1:6379";
    _db = await redis.connect(redis.parseURL(dbURL));
  }
  return _db;
}

function close() {
  _db?.close();
  _db = null;
}

function makeCountryPrefix(country: string): string {
  return `${KEY_PREFIX}:${normKey(country)}`;
}

function makeCodeKey(country: string, code: string): string {
  return `${makeCountryPrefix(country)}:${normKey(code)}`;
}

function makeAllCodesKey(country: string): string {
  return `${KEY_PREFIX}:all-codes:${normKey(country)}`;
}

async function setCodeData(
  country: string,
  codeData: GeoName,
) {
  using db = await getDB();
  const key = makeCodeKey(country, codeData.postal_code);
  const pl = db.pipeline();
  const trimmedData = Object.entries(codeData).filter(([_, value]) =>
    !(typeof value === "string" && value.length === 0)
  );
  pl.hset(key, ...trimmedData);
  pl.sadd(makeAllCodesKey(country), codeData.postal_code);
  const [hret, sret] = await pl.flush();
  return [hret, sret];
}

async function getCodeData(
  country: string,
  code: string,
): Promise<GeoName | z.ZodError<GeoName> | null> {
  using db = await getDB();
  const key = makeCodeKey(country, code);
  const data = await db.hgetall(key);
  if (data.length) {
    const codeData = GeoNameSchema.safeParse(
      Object.fromEntries(chunk(data, 2)),
    );
    return codeData.success ? codeData.data : codeData.error;
  } else {
    return null;
  }
}

async function countryExists(country: string): Promise<boolean> {
  using db = await getDB();
  const pattern = `${makeCountryPrefix(country)}:*`;
  const [_, results] = await db.scan(0, { pattern, count: 1 });
  return !!results.length;
}

async function getAllCodes(country: string): Promise<string[]> {
  using db = await getDB();
  const key = makeAllCodesKey(country);
  const res = await db.sort(key, { alpha: true });
  return res;
}

export {
  close,
  countryExists,
  getAllCodes,
  getCodeData,
  getDB,
  makeAllCodesKey,
  makeCodeKey,
  setCodeData,
};
