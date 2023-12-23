import { chunk, redis } from "../deps.ts";
import { type GeoName, GeoNameSchema } from "./schemas.ts";
import { normKey } from "./utils.ts";

const PREFIX = "postal-codes";
const VERSION = 1;

let _db: redis.Redis | null = null;

async function getDB(): Promise<redis.Redis> {
  if (!_db) {
    const dbURL = Deno.env.get("REDIS_URL") ?? "redis://127.0.0.1:6379";
    _db = await redis.connect(redis.parseURL(dbURL));
  }
  return _db;
}

function close() {
  _db?.close();
  _db = null;
}

async function get(key: string): Promise<string | null> {
  const db = await getDB();
  const value = await db.get(key);
  return value;
}

async function set(
  key: string,
  value: string,
  opts?: redis.SetOpts,
): Promise<string> {
  const db = await getDB();
  const ret = await db.set(key, value, opts);
  return ret;
}

function makeCodeKey(country: string, code: string): string {
  return `${PREFIX}:${VERSION}:${normKey(country)}:${normKey(code)}`;
}

function makeAllCodesKey(country: string): string {
  return `${PREFIX}:${VERSION}:${normKey(country)}:all-codes`;
}

async function setCodeData(country: string, codeData: GeoName) {
  const db = await getDB();
  const pl = db.pipeline();
  const key = makeCodeKey(country, codeData.postal_code);
  pl.hset(key, codeData);
  pl.sadd(makeAllCodesKey(country), codeData.postal_code);
  const ret = await pl.flush();
  return ret;
}

async function getCodeData(
  country: string,
  code: string,
): Promise<GeoName | null> {
  const db = await getDB();
  const key = makeCodeKey(country, code);
  const data = await db.hgetall(key);
  if (data.length) {
    const codeData = GeoNameSchema.safeParse(
      Object.fromEntries(chunk(data, 2)),
    );
    return codeData.success ? codeData.data : null;
  } else {
    return null;
  }
}

export {
  close,
  get,
  getCodeData,
  getDB,
  makeAllCodesKey,
  makeCodeKey,
  set,
  setCodeData,
};
