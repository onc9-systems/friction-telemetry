/**
 * Who is calling, until phase 02 lands sign-in: the sample workspace's organization and signed-in employee
 * (packages/contracts/fixtures/workspace.json). Phase 02 replaces every use with `requireActor`.
 */
export const SHELL_ACTOR = { organizationId: "org_acme", userId: "usr_sam" } as const;
