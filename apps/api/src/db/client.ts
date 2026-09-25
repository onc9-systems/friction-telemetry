import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * A Drizzle client over Hyperdrive for one request. Never hold one at module scope: a Worker cannot
 * perform I/O on behalf of a different request. Hyperdrive pools and caches reads (no invalidation on
 * write), so read-after-write belongs inside the same transaction.
 */
export async function openDb(env: Pick<Env, "HYPERDRIVE">) {
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  return drizzle({ client, schema });
}

/**
 * A client over the cache-disabled Hyperdrive config. The answer path and anything that reads what it just
 * wrote (document status polling) use this, so a published Q&A entry or a replaced document is seen at once.
 */
export async function openFreshDb(env: Pick<Env, "HYPERDRIVE_NOCACHE">) {
  const client = new Client({ connectionString: env.HYPERDRIVE_NOCACHE.connectionString });
  await client.connect();
  return drizzle({ client, schema });
}

export type Db = Awaited<ReturnType<typeof openDb>>;

/** Runs `fn` with a client from `open` and always closes the connection afterwards. */
export async function withDb<T>(open: Promise<Db>, fn: (db: Db) => Promise<T>): Promise<T> {
  const db = await open;
  try {
    return await fn(db);
  } finally {
    await db.$client.end();
  }
}
/** A transaction handle from `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
