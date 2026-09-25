import * as z from "zod";
import { INITIATIVE_STATUS, MEMBER_ROLE } from "../enums";
import { AuthId, CalendarDate, Id, Instant } from "../primitives";

export const InitiativeStatus = z.enum(INITIATIVE_STATUS);
export type InitiativeStatus = z.infer<typeof InitiativeStatus>;

export const Initiative = z.object({
  id: Id,
  organizationId: AuthId,
  name: z.string().min(1),
  whatIsChanging: z.string(),
  why: z.string(),
  status: InitiativeStatus,
  targetDate: CalendarDate.nullable(),
  createdAt: Instant,
  closedAt: Instant.nullable(),
});
export type Initiative = z.infer<typeof Initiative>;

export const MemberRole = z.enum(MEMBER_ROLE);
export type MemberRole = z.infer<typeof MemberRole>;

export const InitiativeMember = z.object({
  initiativeId: Id,
  userId: AuthId,
  role: MemberRole,
});
export type InitiativeMember = z.infer<typeof InitiativeMember>;
