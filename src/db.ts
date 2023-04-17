import { type ZIPEntry } from "./zip_code.ts";
// @deno-types="npm:@types/better-sqlite3"
import SqliteDatabse from "better-sqlite3";
import { Generated, Kysely, SqliteDialect } from "kysely";

interface ZIPRow extends ZIPEntry {
  id: Generated<number>;
}

interface Database {
  zip: ZIPRow;
}

const db = new Kysely<Database>({
  dialect: new SqliteDialect({ database: new SqliteDatabse(":memory:") }),
});

export { db };
