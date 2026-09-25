import * as z from "zod";
import { AuthId } from "../primitives";

// Not a Core Concept: the sample organization and people directory the shell runs on.
// Phase 02 replaces the source with better-auth's organization and members.

export const Organization = z.object({
  id: AuthId,
  name: z.string().min(1),
});
export type Organization = z.infer<typeof Organization>;

export const Person = z.object({
  id: AuthId,
  name: z.string().min(1),
  email: z.email(),
  title: z.string().nullable(),
  /** Leader permission: sees the initiative surface. */
  leader: z.boolean(),
});
export type Person = z.infer<typeof Person>;

export const Workspace = z.object({
  organization: Organization,
  people: z.array(Person),
  signedInUserId: AuthId,
});
export type Workspace = z.infer<typeof Workspace>;
