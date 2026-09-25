// "23 others hit this" (flow 8): distinct other employees with a flag or question in the same initiative in
// the last 30 days whose embedding is close to this event's. People, not events. Clusters replace this in 09.
import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { toPgVector } from "../ai/embed";
import { THRESHOLDS as T } from "./thresholds";

export async function othersCount(
  db: Db,
  input: { organizationId: string; initiativeId: string; userId: string; vector: number[] },
): Promise<number> {
  const v = sql`${toPgVector(input.vector)}::vector`;
  const scope = sql`organization_id = ${input.organizationId} and initiative_id = ${input.initiativeId}
    and user_id <> ${input.userId} and embedding is not null
    and created_at > now() - make_interval(days => ${T.othersWindowDays})
    and 1 - (embedding <=> ${v}) >= ${T.othersCosine}`;
  const { rows } = await db.execute<{ n: number }>(sql`
    select count(distinct user_id)::int as n from (
      select user_id from flag where ${scope}
      union all
      select user_id from question where ${scope}
    ) x`);
  return rows[0]?.n ?? 0;
}
