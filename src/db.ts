// @deno-types="npm:@types/better-sqlite3"
import SqliteDatabse from "better-sqlite3";
import { Generated, Kysely, SqliteDialect } from "kysely";

import { type GeoName, type ZIPEntry } from "./schemas.ts";

interface ZIPRow extends ZIPEntry {
  id: Generated<number>;
}

interface GeoNameRow extends GeoName {
  id: Generated<number>;
}

interface Database {
  geo: GeoNameRow;
}

let db: Kysely<Database>;

function getDB(): Kysely<Database> {
  if (db) {
    return db;
  }
  db = new Kysely<Database>({
    dialect: new SqliteDialect({ database: new SqliteDatabse(":memory:") }),
  });
  return db;
}

export { getDB };
