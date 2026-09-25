// The full domain schema, migrated in the shell so feature phases only add columns.
// Rules: every table has `organization_id text not null`; user references are `text` without foreign keys
// until phase 02 adds better-auth's tables; enums come from the contracts' tuples; timestamps are
// `timestamptz` read as `Date` and serialized with `toISOString()` at the API boundary.
import { sql, type SQL } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  real,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import {
  DOCUMENT_VERSION_STATUS,
  HEALTH_LABEL,
  INITIATIVE_STATUS,
  MEMBER_ROLE,
  NOTICE_KIND,
  QA_ENTRY_STATUS,
  RECORD_KIND,
  RESOLUTION_CLASS,
  THESIS_RELATION,
  THESIS_VERDICT,
  type HealthComponent,
} from "@friction-telemetry/contracts";

// ---------------------------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------------------------

export const initiativeStatus = pgEnum("initiative_status", INITIATIVE_STATUS);
export const thesisVerdict = pgEnum("thesis_verdict", THESIS_VERDICT);
export const memberRole = pgEnum("member_role", MEMBER_ROLE);
export const documentVersionStatus = pgEnum("document_version_status", DOCUMENT_VERSION_STATUS);
export const resolutionClass = pgEnum("resolution_class", RESOLUTION_CLASS);
export const qaEntryStatus = pgEnum("qa_entry_status", QA_ENTRY_STATUS);
export const noticeKind = pgEnum("notice_kind", NOTICE_KIND);
export const healthLabel = pgEnum("health_label", HEALTH_LABEL);
export const thesisRelation = pgEnum("thesis_relation", THESIS_RELATION);
/** A flag or a question: the two kinds of event an employee sends. */
export const eventKind = pgEnum("event_kind", RECORD_KIND);

/** How a flag or question came to be linked to a Q&A entry. Service-only, so it is not in the contracts. */
export const QA_LINK_SOURCE = ["cited", "owner_answer", "cluster"] as const;
export const qaLinkSource = pgEnum("qa_link_source", QA_LINK_SOURCE);

// ---------------------------------------------------------------------------------------------
// Column helpers
// ---------------------------------------------------------------------------------------------

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const organizationId = () => text("organization_id").notNull();

/** Columns the answer pipeline writes on both flags and questions (flows 8, 9). */
const eventPipelineColumns = () => ({
  /** The embedded event text, for "N others" and later clustering. */
  embedding: vector("embedding", { dimensions: 1024 }),
  initiativeConfidence: real("initiative_confidence"),
  routedAt: ts("routed_at"),
  stillStuckAt: ts("still_stuck_at"),
  stillStuckReason: text("still_stuck_reason"),
});

// ---------------------------------------------------------------------------------------------
// Initiatives (flows 3, 4, 5)
// ---------------------------------------------------------------------------------------------

export const initiative = pgTable(
  "initiative",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    name: text().notNull(),
    whatIsChanging: text("what_is_changing").notNull().default(""),
    why: text().notNull().default(""),
    status: initiativeStatus().notNull().default("draft"),
    targetDate: date("target_date", { mode: "string" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    closedAt: ts("closed_at"),
  },
  (t) => [index("initiative_org_idx").on(t.organizationId)],
);

export const thesis = pgTable(
  "thesis",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    statement: text().notNull(),
    verdict: thesisVerdict().notNull().default("no_evidence"),
    position: integer().notNull().default(0),
  },
  (t) => [index("thesis_org_initiative_idx").on(t.organizationId, t.initiativeId)],
);

/** Affected people, owners, and leaders of an initiative. The Owner concept lives here as role `owner`. */
export const initiativeMember = pgTable(
  "initiative_member",
  {
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: memberRole().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.initiativeId, t.userId, t.role] }),
    index("initiative_member_org_user_idx").on(t.organizationId, t.userId),
  ],
);

// ---------------------------------------------------------------------------------------------
// Documents and passages (flows 3, 3a, 4, 19)
// ---------------------------------------------------------------------------------------------

export const document = pgTable(
  "document",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    title: text().notNull(),
    activeVersionId: uuid("active_version_id").references((): AnyPgColumn => documentVersion.id, {
      onDelete: "set null",
    }),
    suspect: boolean().notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    /** Removed documents leave search at once; answers keep their copied quotes. */
    removedAt: ts("removed_at"),
  },
  (t) => [index("document_org_initiative_idx").on(t.organizationId, t.initiativeId)],
);

export const documentVersion = pgTable(
  "document_version",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    documentId: uuid("document_id")
      .notNull()
      .references((): AnyPgColumn => document.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    status: documentVersionStatus().notNull().default("uploading"),
    failureReason: text("failure_reason"),
    passageCount: integer("passage_count"),
    createdAt: ts("created_at").notNull().defaultNow(),
    /** The uploaded file's name with its extension. */
    fileName: text("file_name").notNull().default(""),
    uploadedByUserId: text("uploaded_by_user_id").notNull().default(""),
    /** `DocumentFailureCode` from the contracts; `failure_reason` is the UI copy. */
    failureCode: text("failure_code"),
    warning: text(),
    /** When processing last changed state; drives "Taking longer than usual." */
    statusChangedAt: ts("status_changed_at").notNull().defaultNow(),
  },
  (t) => [index("document_version_document_idx").on(t.documentId)],
);

/** A retrievable span of a document version, searched by vector and by full text. */
export const passage = pgTable(
  "passage",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersion.id, { onDelete: "cascade" }),
    headingPath: text("heading_path").notNull(),
    /** Page or slide number, when the format has one. */
    locator: integer(),
    text: text().notNull(),
    position: integer().notNull(),
    /** Workers AI `@cf/qwen/qwen3-embedding-0.6b`. Null until indexed. */
    embedding: vector("embedding", { dimensions: 1024 }),
    tsv: tsvector("tsv")
      .notNull()
      .generatedAlwaysAs((): SQL => sql`to_tsvector('english', ${passage.text})`),
  },
  (t) => [
    index("passage_org_initiative_idx").on(t.organizationId, t.initiativeId),
    index("passage_document_version_idx").on(t.documentVersionId),
    index("passage_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("passage_tsv_gin").using("gin", t.tsv),
  ],
);

// ---------------------------------------------------------------------------------------------
// Flags, questions, answers (flows 6, 7, 8, 9)
// ---------------------------------------------------------------------------------------------

export const flag = pgTable(
  "flag",
  {
    /** Generated on the Mac, no default: a retried send upserts on it. */
    id: uuid().primaryKey(),
    organizationId: organizationId(),
    userId: text("user_id").notNull(),
    /** Null until the service judges which initiative the flag is about. */
    initiativeId: uuid("initiative_id").references(() => initiative.id, { onDelete: "cascade" }),
    transcript: text().notNull(),
    screenshotKey: text("screenshot_key"),
    clipKey: text("clip_key"),
    appNames: text("app_names").array().notNull().default(sql`'{}'::text[]`),
    resolutionClass: resolutionClass("resolution_class"),
    createdAt: ts("created_at").notNull().defaultNow(),
    ...eventPipelineColumns(),
  },
  (t) => [
    index("flag_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("flag_org_initiative_idx").on(t.organizationId, t.initiativeId),
    index("flag_org_user_idx").on(t.organizationId, t.userId),
  ],
);

export const question = pgTable(
  "question",
  {
    /** Generated on the Mac, no default: a retried send upserts on it. */
    id: uuid().primaryKey(),
    organizationId: organizationId(),
    userId: text("user_id").notNull(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    text: text().notNull(),
    resolutionClass: resolutionClass("resolution_class"),
    createdAt: ts("created_at").notNull().defaultNow(),
    ...eventPipelineColumns(),
    /** A follow-up: the flag or question it replies to. */
    inReplyToKind: eventKind("in_reply_to_kind"),
    inReplyToId: uuid("in_reply_to_id"),
    /** First turn of the thread; equals the parent's root. Null on a thread's first question. */
    threadRootKind: eventKind("thread_root_kind"),
    threadRootId: uuid("thread_root_id"),
    /** The follow-up rewritten to stand on its own, used for retrieval, judgment and counting. */
    standaloneText: text("standalone_text"),
  },
  (t) => [
    index("question_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("question_thread_root_idx").on(t.threadRootId),
    check("question_reply_pair", sql`num_nonnulls(${t.inReplyToKind}, ${t.inReplyToId}) in (0, 2)`),
    index("question_org_initiative_idx").on(t.organizationId, t.initiativeId),
    index("question_org_user_idx").on(t.organizationId, t.userId),
  ],
);

/** An answer replies to exactly one flag or one question. */
export const answer = pgTable(
  "answer",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    flagId: uuid("flag_id").references(() => flag.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => question.id, { onDelete: "cascade" }),
    text: text().notNull(),
    provisionalShown: boolean("provisional_shown").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    /** Set when the employee switched initiative and a new answer replaced this one. */
    supersededAt: ts("superseded_at"),
    /** `answered`, `middle`, or `unanswerable`: how the verification judged the passages. */
    band: text(),
    othersCount: integer("others_count"),
    initiativeId: uuid("initiative_id").references(() => initiative.id, { onDelete: "cascade" }),
  },
  (t) => [
    check("answer_exactly_one_target", sql`num_nonnulls(${t.flagId}, ${t.questionId}) = 1`),
    index("answer_flag_idx").on(t.flagId),
    index("answer_question_idx").on(t.questionId),
  ],
);

/**
 * One citation of an answer, pointing at exactly one passage or Q&A entry. The quote, title, and locator
 * are copied at answer time, so the source ids carry no foreign key: an answer stays readable after its
 * document is replaced or removed.
 */
export const citation = pgTable(
  "citation",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answer.id, { onDelete: "cascade" }),
    /** 1-based number shown on the chip; the order of `Answer.citations`. */
    ordinal: integer().notNull(),
    passageId: uuid("passage_id"),
    qaEntryId: uuid("qa_entry_id"),
    quote: text().notNull(),
    documentTitle: text("document_title").notNull(),
    /** Human-readable place in the source, for example "Section 4.2 Approvals". */
    locator: text(),
    charOffset: integer("char_offset").notNull().default(0),
    sourceKind: text("source_kind").notNull().default("document"),
    headingPath: text("heading_path"),
    /** The whole passage or owner answer at answer time, so "Open at passage" survives a replacement. */
    passageText: text("passage_text").notNull().default(""),
    /** The document the passage came from; used to mark it suspect on Still stuck. */
    documentId: uuid("document_id"),
    qaApprovedByUserId: text("qa_approved_by_user_id"),
    qaApprovedAt: ts("qa_approved_at"),
  },
  (t) => [
    check("citation_exactly_one_source", sql`num_nonnulls(${t.passageId}, ${t.qaEntryId}) = 1`),
    uniqueIndex("citation_answer_ordinal_idx").on(t.answerId, t.ordinal),
  ],
);

/** Everything the pipeline decided for one answer: probabilities, ranks, timings. No document text. */
export const pipelineTrace = pgTable(
  "pipeline_trace",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    eventKind: eventKind("event_kind").notNull(),
    eventId: uuid("event_id").notNull(),
    answerId: uuid("answer_id").notNull(),
    jevModel: text("jev_model"),
    trace: jsonb().$type<Record<string, unknown>>().notNull(),
    degraded: text().array().notNull().default(sql`'{}'::text[]`),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pipeline_trace_answer_idx").on(t.answerId), index("pipeline_trace_event_idx").on(t.eventId)],
);

/** A Still stuck report against a cited source (flow 9). Phase 08 clears marks on a corrected version. */
export const suspectMark = pgTable(
  "suspect_mark",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    documentId: uuid("document_id"),
    qaEntryId: uuid("qa_entry_id"),
    passageId: uuid("passage_id"),
    eventKind: eventKind("event_kind").notNull(),
    eventId: uuid("event_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    clearedAt: ts("cleared_at"),
  },
  (t) => [
    index("suspect_mark_document_idx").on(t.documentId),
    index("suspect_mark_event_idx").on(t.eventId),
  ],
);

// ---------------------------------------------------------------------------------------------
// Q&A (flows 10, 15, 18)
// ---------------------------------------------------------------------------------------------

/** A canonical question and its owner-approved answer, searched alongside passages. */
export const qaEntry = pgTable(
  "qa_entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    question: text().notNull(),
    /** Null while drafted. */
    answer: text(),
    status: qaEntryStatus().notNull().default("draft"),
    approvedByUserId: text("approved_by_user_id"),
    approvedAt: ts("approved_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    embedding: vector("embedding", { dimensions: 1024 }),
    tsv: tsvector("tsv")
      .notNull()
      .generatedAlwaysAs(
        (): SQL => sql`to_tsvector('english', ${qaEntry.question} || ' ' || coalesce(${qaEntry.answer}, ''))`,
      ),
  },
  (t) => [
    index("qa_entry_org_initiative_idx").on(t.organizationId, t.initiativeId),
    index("qa_entry_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("qa_entry_tsv_gin").using("gin", t.tsv),
  ],
);

/**
 * Who asked a Q&A entry: links flags and questions to entries. `askedCount` is never stored; it is
 * `count(distinct user_id)` over this table. Written only through `linkEventToQA` (src/qa/links.ts).
 */
export const qaEntryEvent = pgTable(
  "qa_entry_event",
  {
    organizationId: organizationId(),
    qaEntryId: uuid("qa_entry_id")
      .notNull()
      .references(() => qaEntry.id, { onDelete: "cascade" }),
    /** A flag id or a question id, per `event_kind`. */
    eventId: uuid("event_id").notNull(),
    eventKind: eventKind("event_kind").notNull(),
    userId: text("user_id").notNull(),
    source: qaLinkSource().notNull(),
    /** Set for `owner_answer`: the owner who attached the event. */
    attachedByUserId: text("attached_by_user_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.qaEntryId, t.eventId] }),
    uniqueIndex("qa_entry_event_owner_answer_once_idx").on(t.eventId).where(sql`${t.source} = 'owner_answer'`),
    index("qa_entry_event_org_user_idx").on(t.organizationId, t.userId),
  ],
);

// ---------------------------------------------------------------------------------------------
// Clusters and insights (flows 13, 14, 17, 20)
// ---------------------------------------------------------------------------------------------

export const cluster = pgTable(
  "cluster",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    /** Short description of the shared problem. */
    canonical: text().notNull(),
    /** Written by the clustering step with its members, so reads need no count. */
    memberCount: integer("member_count").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("cluster_org_initiative_idx").on(t.organizationId, t.initiativeId)],
);

/** A flag or question grouped into a cluster. */
export const clusterMember = pgTable(
  "cluster_member",
  {
    organizationId: organizationId(),
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => cluster.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull(),
    eventKind: eventKind("event_kind").notNull(),
    userId: text("user_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clusterId, t.eventId] }), index("cluster_member_event_idx").on(t.eventId)],
);

/** The Owner concept on an insight is `owner_user_id`. Its Fix is the `fix` row pointing at it. */
export const insight = pgTable(
  "insight",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    title: text().notNull(),
    /** `Insight.classSplit`. */
    classAnswered: integer("class_answered").notNull().default(0),
    classUnanswerable: integer("class_unanswerable").notNull().default(0),
    classStillStuck: integer("class_still_stuck").notNull().default(0),
    ownerUserId: text("owner_user_id"),
    /** False below the anonymity threshold: evidence stays hidden. */
    evidenceVisible: boolean("evidence_visible").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("insight_org_initiative_idx").on(t.organizationId, t.initiativeId)],
);

/** `Insight.clusterIds`. */
export const insightCluster = pgTable(
  "insight_cluster",
  {
    organizationId: organizationId(),
    insightId: uuid("insight_id")
      .notNull()
      .references(() => insight.id, { onDelete: "cascade" }),
    clusterId: uuid("cluster_id")
      .notNull()
      .references(() => cluster.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.insightId, t.clusterId] }), index("insight_cluster_cluster_idx").on(t.clusterId)],
);

/** `Insight.thesisLinks`: the theses an insight supports or breaks. */
export const insightThesis = pgTable(
  "insight_thesis",
  {
    organizationId: organizationId(),
    insightId: uuid("insight_id")
      .notNull()
      .references(() => insight.id, { onDelete: "cascade" }),
    thesisId: uuid("thesis_id")
      .notNull()
      .references(() => thesis.id, { onDelete: "cascade" }),
    relation: thesisRelation().notNull(),
  },
  (t) => [primaryKey({ columns: [t.insightId, t.thesisId] }), index("insight_thesis_thesis_idx").on(t.thesisId)],
);

export const fix = pgTable(
  "fix",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    insightId: uuid("insight_id")
      .notNull()
      .references(() => insight.id, { onDelete: "cascade" }),
    recordedByUserId: text("recorded_by_user_id").notNull(),
    summary: text().notNull(),
    recordedAt: ts("recorded_at").notNull().defaultNow(),
  },
  (t) => [index("fix_insight_idx").on(t.insightId)],
);

// ---------------------------------------------------------------------------------------------
// Notices and health (flows 16, 18, 21)
// ---------------------------------------------------------------------------------------------

export const notice = pgTable(
  "notice",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    userId: text("user_id").notNull(),
    kind: noticeKind().notNull(),
    /** The Fix or QAEntry this notice is about, per `kind`. */
    refId: uuid("ref_id").notNull(),
    title: text().notNull(),
    body: text().notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
    readAt: ts("read_at"),
  },
  (t) => [index("notice_org_user_created_idx").on(t.organizationId, t.userId, t.createdAt)],
);

export const healthSnapshot = pgTable(
  "health_snapshot",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: organizationId(),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiative.id, { onDelete: "cascade" }),
    label: healthLabel().notNull(),
    /** One line on what changed since last week. */
    changeSummary: text("change_summary").notNull().default(""),
    /** Compile-time type only; parse with the contracts' `HealthComponent` on read. */
    components: jsonb().$type<HealthComponent[]>().notNull(),
    computedAt: ts("computed_at").notNull().defaultNow(),
  },
  (t) => [index("health_snapshot_initiative_computed_idx").on(t.initiativeId, t.computedAt)],
);
