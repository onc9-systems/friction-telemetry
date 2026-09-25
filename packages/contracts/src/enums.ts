// One tuple per enum. Zod schemas and Drizzle pgEnums are both built from these,
// so the database and the wire can never disagree on a member.
export const INITIATIVE_STATUS = ["draft", "live", "closed"] as const;
export const THESIS_VERDICT = ["holding", "breaking", "no_evidence"] as const;
export const MEMBER_ROLE = ["affected", "owner", "leader"] as const;
/** Organization-level roles (02-auth-workspace). Distinct from an initiative's `MEMBER_ROLE`. */
export const ROLE = ["employee", "leader", "admin"] as const;
export const DOCUMENT_VERSION_STATUS = ["uploading", "extracting", "indexing", "ready", "failed"] as const;
export const RESOLUTION_CLASS = ["answered", "unanswerable", "still_stuck"] as const;
export const QA_ENTRY_STATUS = ["draft", "published", "needs_reapproval"] as const;
export const NOTICE_KIND = ["fix_recorded", "qa_published"] as const;
export const HEALTH_LABEL = ["healthy", "at_risk", "breaking"] as const;
export const HEALTH_DIRECTION = ["up", "down", "flat"] as const;
export const THESIS_RELATION = ["supports", "breaks"] as const;
export const RECORD_KIND = ["flag", "question"] as const;
export const RECORD_OUTCOME = ["answered", "with_owner", "fixed"] as const;
export const TIMELINE_STEP = ["sent", "answered", "routed", "qa_published", "fixed"] as const;
export const CAPTURE_PART_KIND = ["video", "audio"] as const;
export const CAPTURE_PART_STATUS = ["uploading", "received"] as const;
export const TRANSCRIPT_STATUS = ["waiting", "transcribing", "done", "failed"] as const;
export const WINDOW_EVENT_REASON = ["activated", "title_changed"] as const;
