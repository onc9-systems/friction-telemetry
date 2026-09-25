// What the early Jev request reads about each candidate initiative: its name, what is changing, and an
// outline of what its documents and Q&A cover (section headings and published canonical questions).
import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import type { InitiativeRow } from "../initiatives/membership";
import { slugify, type InitiativeOption } from "./classify";
import type { InitiativeState } from "./jev";

export type Candidate = InitiativeOption & { whatIsChanging: string; outline: string[] };

export async function candidates(db: Db, organizationId: string, live: InitiativeRow[]): Promise<Candidate[]> {
  if (live.length === 0) return [];
  const ids = sql`${`{${live.map((i) => i.id).join(",")}}`}::uuid[]`;
  const { rows } = await db.execute<{ initiative_id: string; line: string }>(sql`
    select initiative_id, line from (
      select p.initiative_id, p.heading_path as line, min(d.created_at) as doc_at, min(p.position) as pos
      from passage p
      join document d on d.active_version_id = p.document_version_id and d.removed_at is null
      where p.organization_id = ${organizationId} and p.initiative_id = any(${ids}) and p.heading_path <> ''
      group by p.initiative_id, p.heading_path
      union all
      select e.initiative_id, 'Q: ' || e.question, e.approved_at, 0
      from qa_entry e
      where e.organization_id = ${organizationId} and e.initiative_id = any(${ids}) and e.status = 'published'
    ) o order by initiative_id, doc_at nulls last, pos`);
  const slugs = slugify(live.map((i) => i.name));
  return live.map((i, k) => ({
    initiativeId: i.id,
    name: i.name,
    slug: slugs[k]!,
    whatIsChanging: i.whatIsChanging,
    outline: rows.filter((r) => r.initiative_id === i.id).map((r) => r.line),
  }));
}

export const toJevState = (c: Candidate): InitiativeState => ({
  slug: c.slug,
  name: c.name,
  whatIsChanging: c.whatIsChanging,
  outline: c.outline,
});
