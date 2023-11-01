import { redis } from "../deps.ts";

let db: redis.Redis | null = null;

async function getDB(): Promise<redis.Redis> {
  if (!db) {
    const dbURL = Deno.env.get("REDIS_URL") ?? "redis://127.0.0.1:6379";
    db = await redis.connect(redis.parseURL(dbURL));
  }
  return db;
}

export { getDB };
