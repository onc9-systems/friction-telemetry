// The one definition of "belongs to" (spec 05, exported for 06 and 07). A person belongs to an initiative
// when they hold any role on it: affected, owner, or leader (a leader is also an employee).
import { and, asc, eq, inArray } from "drizzle-orm";
import type { MemberRole } from "@friction-telemetry/contracts";
import type { Db, Tx } from "../db/client";
import { initiative, initiativeMember } from "../db/schema";
import type { Actor } from "../lib/actor";

export type InitiativeRow = typeof initiative.$inferSelect;

/** Live initiatives the person belongs to, by name. */
export async function liveInitiativesFor(db: Db | Tx, actor: Actor): Promise<InitiativeRow[]> {
  return db
    .selectDistinct({ i: initiative })
    .from(initiative)
    .innerJoin(initiativeMember, eq(initiativeMember.initiativeId, initiative.id))
    .where(
      and(
        eq(initiative.organizationId, actor.organizationId),
        eq(initiative.status, "live"),
        eq(initiativeMember.userId, actor.userId),
      ),
    )
    .orderBy(asc(initiative.name))
    .then((rows) => rows.map((r) => r.i));
}

/** The initiative and the person's roles on it. Null when it is not in the person's organization. */
export async function initiativeWithRoles(
  db: Db | Tx,
  actor: Actor,
  initiativeId: string,
): Promise<{ initiative: InitiativeRow; roles: MemberRole[] } | null> {
  const [row] = await db
    .select()
    .from(initiative)
    .where(and(eq(initiative.id, initiativeId), eq(initiative.organizationId, actor.organizationId)));
  if (!row) return null;
  const roles = await db
    .select({ role: initiativeMember.role })
    .from(initiativeMember)
    .where(and(eq(initiativeMember.initiativeId, initiativeId), eq(initiativeMember.userId, actor.userId)));
  return { initiative: row, roles: roles.map((r) => r.role) };
}

/** Leaders manage an initiative; owners act on what reaches them. */
export const canManage = (roles: MemberRole[]) => roles.includes("leader");
export const canSeeRouted = (roles: MemberRole[]) => roles.includes("leader") || roles.includes("owner");

export async function membersOf(db: Db | Tx, initiativeIds: string[]) {
  if (initiativeIds.length === 0) return [];
  return db.select().from(initiativeMember).where(inArray(initiativeMember.initiativeId, initiativeIds));
}
