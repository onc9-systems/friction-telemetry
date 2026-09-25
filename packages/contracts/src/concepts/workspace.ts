import * as z from "zod";
import { ROLE } from "../enums";
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

/**
 * The fixed people directory (`fixtures/fixed-directory.json`): one organization and the only people who can
 * act on the service until phase 02 lands sign-in. The service accepts no one else; the Mac offers exactly these.
 */
export const Directory = z.object({
  organization: Organization,
  people: z.array(Person).min(1),
});
export type Directory = z.infer<typeof Directory>;

export const Role = z.enum(ROLE);
export type Role = z.infer<typeof Role>;

/** `GET /v1/me` (02-auth-workspace). The Mac reads `permissions`, never the role strings. */
export const Me = z.object({
  person: Person,
  organization: Organization,
  /** Always includes `employee`. */
  roles: z.array(Role).min(1),
  permissions: z.object({
    /** True exactly when `roles` includes `leader`. */
    initiativeSurface: z.boolean(),
    /** True exactly when `roles` includes `admin`. */
    workspaceAdmin: z.boolean(),
  }),
});
export type Me = z.infer<typeof Me>;
