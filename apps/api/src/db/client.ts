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

export type Db = Awaited<ReturnType<typeof openDb>>;
/** A transaction handle from `db.transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
