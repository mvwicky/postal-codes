import { redis } from "../deps.ts";

let _db: redis.Redis | null = null;

async function getDB(): Promise<redis.Redis> {
  if (!_db) {
    const dbURL = Deno.env.get("REDIS_URL") ?? "redis://127.0.0.1:6379";
    _db = await redis.connect(redis.parseURL(dbURL));
  }
  return _db;
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

export { get, getDB, set };
