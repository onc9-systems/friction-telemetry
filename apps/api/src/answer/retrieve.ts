// Hybrid retrieval (flow 8): per candidate initiative, pgvector cosine top 20 and Postgres full text top 20
// over document passages and published Q&A, in one statement; fused with reciprocal rank fusion
// (pgvector README recommends RRF for hybrid search, Context7 /pgvector/pgvector).
//
// The search visibility invariant, all in SQL: same organization, initiative live, passage from the
// document's active version, document not removed; Q&A entries only when published.
import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { toPgVector } from "../ai/embed";
import { fuseRrf } from "./classify";
import { THRESHOLDS as T } from "./thresholds";

export type Retrieved = {
  key: string;
  kind: "document" | "qa";
  id: string;
  initiativeId: string;
  text: string;
  /** Document title, or the canonical Q&A question. */
  title: string;
  headingPath: string | null;
  locator: number | null;
  documentId: string | null;
  suspect: boolean;
  qaQuestion: string | null;
  qaApprovedByUserId: string | null;
  qaApprovedAt: Date | null;
  fusedRank: number;
  score: number;
  cosine: number | null;
  vectorRank: number | null;
  textRank: number | null;
};

type Row = {
  arm: "vector" | "text";
  kind: "document" | "qa";
  id: string;
  initiative_id: string;
  text: string;
  title: string;
  heading_path: string | null;
  locator: number | null;
  document_id: string | null;
  suspect: boolean;
  qa_question: string | null;
  qa_approved_by: string | null;
  qa_approved_at: Date | string | null;
  rnk: number;
  cosine: number | null;
};

const uuidArray = (ids: string[]) => sql`${`{${ids.join(",")}}`}::uuid[]`;

/** The four arms as one UNION ALL; vector arms only when an embedding exists. */
function statement(org: string, initiativeIds: string[], text: string, vector: number[] | null): SQL {
  const k = T.retrieveTopK;
  const ids = uuidArray(initiativeIds);
  const docScope = sql`
    from passage p
    join document d on d.active_version_id = p.document_version_id and d.removed_at is null
    join initiative i on i.id = p.initiative_id and i.status = 'live'
    where p.organization_id = ${org} and p.initiative_id = iid`;
  const qaScope = sql`
    from qa_entry e
    join initiative i on i.id = e.initiative_id and i.status = 'live'
    where e.organization_id = ${org} and e.initiative_id = iid and e.status = 'published'`;
  const docCols = sql`'document' as kind, p.id, p.initiative_id, p.text, d.title, p.heading_path, p.locator, d.id as document_id,
    d.suspect, null::text as qa_question, null::text as qa_approved_by, null::timestamptz as qa_approved_at`;
  const qaCols = sql`'qa' as kind, e.id, e.initiative_id, e.answer as text, e.question as title, null::text as heading_path,
    null::int as locator, null::uuid as document_id, false as suspect, e.question as qa_question, e.approved_by_user_id as qa_approved_by, e.approved_at as qa_approved_at`;
  // Any term, not every term: an employee's sentence rarely shares all its words with one passage.
  // ts_rank_cd still ranks passages that cover more of the terms, closer together, first.
  const tsq = sql`coalesce(nullif(replace(websearch_to_tsquery('english', ${text})::text, ' & ', ' | '), '')::tsquery, ''::tsquery)`;

  const arms: SQL[] = [
    sql`select 'text' as arm, x.* from unnest(${ids}) iid cross join lateral (
      select ${docCols}, row_number() over (order by ts_rank_cd(p.tsv, ${tsq}) desc, p.id)::int as rnk, null::float8 as cosine
      ${docScope} and p.tsv @@ ${tsq} order by ts_rank_cd(p.tsv, ${tsq}) desc, p.id limit ${k}) x`,
    sql`select 'text' as arm, x.* from unnest(${ids}) iid cross join lateral (
      select ${qaCols}, row_number() over (order by ts_rank_cd(e.tsv, ${tsq}) desc, e.id)::int as rnk, null::float8 as cosine
      ${qaScope} and e.tsv @@ ${tsq} order by ts_rank_cd(e.tsv, ${tsq}) desc, e.id limit ${k}) x`,
  ];
  if (vector) {
    const v = sql`${toPgVector(vector)}::vector`;
    arms.push(
      sql`select 'vector' as arm, x.* from unnest(${ids}) iid cross join lateral (
        select ${docCols}, row_number() over (order by p.embedding <=> ${v})::int as rnk, (1 - (p.embedding <=> ${v}))::float8 as cosine
        ${docScope} and p.embedding is not null order by p.embedding <=> ${v} limit ${k}) x`,
      sql`select 'vector' as arm, x.* from unnest(${ids}) iid cross join lateral (
        select ${qaCols}, row_number() over (order by e.embedding <=> ${v})::int as rnk, (1 - (e.embedding <=> ${v}))::float8 as cosine
        ${qaScope} and e.embedding is not null order by e.embedding <=> ${v} limit ${k}) x`,
    );
  }
  return sql.join(arms, sql` union all `);
}

/** Top passages per initiative, fused. Map keyed by initiative id; every candidate id has an entry. */
export async function retrieve(
  db: Db,
  input: { organizationId: string; initiativeIds: string[]; text: string; vector: number[] | null },
): Promise<Map<string, Retrieved[]>> {
  const out = new Map<string, Retrieved[]>(input.initiativeIds.map((id) => [id, []]));
  if (input.initiativeIds.length === 0) return out;
  const { rows } = await db.execute<Row>(statement(input.organizationId, input.initiativeIds, input.text, input.vector));

  for (const initiativeId of input.initiativeIds) {
    const mine = rows.filter((r) => r.initiative_id === initiativeId);
    const byKey = new Map<string, Row[]>();
    for (const r of mine) {
      const key = `${r.kind}:${r.id}`;
      byKey.set(key, [...(byKey.get(key) ?? []), r]);
    }
    const ranked = (arm: Row["arm"], kind: Row["kind"]) =>
      mine.filter((r) => r.arm === arm && r.kind === kind).sort((a, b) => a.rnk - b.rnk).map((r) => `${r.kind}:${r.id}`);
    const fused = fuseRrf([ranked("vector", "document"), ranked("text", "document"), ranked("vector", "qa"), ranked("text", "qa")]);
    out.set(
      initiativeId,
      fused.slice(0, T.keepPerInitiative).map(({ key, score }, i) => {
        const hits = byKey.get(key)!;
        const r = hits[0]!;
        const vec = hits.find((h) => h.arm === "vector");
        const txt = hits.find((h) => h.arm === "text");
        return {
          key,
          kind: r.kind,
          id: r.id,
          initiativeId,
          text: r.text,
          title: r.title,
          headingPath: r.heading_path || null,
          locator: r.locator,
          documentId: r.document_id,
          suspect: r.suspect,
          qaQuestion: r.qa_question,
          qaApprovedByUserId: r.qa_approved_by,
          qaApprovedAt: r.qa_approved_at ? new Date(r.qa_approved_at) : null,
          fusedRank: i + 1,
          score,
          cosine: vec?.cosine ?? null,
          vectorRank: vec?.rnk ?? null,
          textRank: txt?.rnk ?? null,
        };
      }),
    );
  }
  return out;
}

/** "Procurement Policy v3 · 4.2 Approvals · Page 12", or the Q&A title. */
export function sourceTitle(r: Pick<Retrieved, "kind" | "title" | "headingPath" | "locator">): string {
  if (r.kind === "qa") return "Owner answer";
  const leaf = r.headingPath?.split(" > ").pop();
  return [r.title, leaf, r.locator ? `Page ${r.locator}` : null].filter(Boolean).join(" · ");
}

/** The human-readable place in the source stored on a citation ("4.2 Approvals · Page 12"). */
export function locatorText(r: Pick<Retrieved, "kind" | "headingPath" | "locator">): string | null {
  if (r.kind === "qa") return null;
  const leaf = r.headingPath?.split(" > ").pop();
  return [leaf, r.locator ? `Page ${r.locator}` : null].filter(Boolean).join(" · ") || null;
}
