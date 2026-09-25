CREATE TYPE "public"."document_version_status" AS ENUM('uploading', 'extracting', 'indexing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('flag', 'question');--> statement-breakpoint
CREATE TYPE "public"."health_label" AS ENUM('healthy', 'at_risk', 'breaking');--> statement-breakpoint
CREATE TYPE "public"."initiative_status" AS ENUM('draft', 'live', 'closed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('affected', 'owner', 'leader');--> statement-breakpoint
CREATE TYPE "public"."notice_kind" AS ENUM('fix_recorded', 'qa_published');--> statement-breakpoint
CREATE TYPE "public"."qa_entry_status" AS ENUM('draft', 'published', 'needs_reapproval');--> statement-breakpoint
CREATE TYPE "public"."qa_link_source" AS ENUM('cited', 'owner_answer', 'cluster');--> statement-breakpoint
CREATE TYPE "public"."resolution_class" AS ENUM('answered', 'unanswerable', 'still_stuck');--> statement-breakpoint
CREATE TYPE "public"."thesis_relation" AS ENUM('supports', 'breaks');--> statement-breakpoint
CREATE TYPE "public"."thesis_verdict" AS ENUM('holding', 'breaking', 'no_evidence');--> statement-breakpoint
CREATE TABLE "answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"flag_id" uuid,
	"question_id" uuid,
	"text" text NOT NULL,
	"provisional_shown" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_exactly_one_target" CHECK (num_nonnulls("answer"."flag_id", "answer"."question_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "citation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"answer_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"passage_id" uuid,
	"qa_entry_id" uuid,
	"quote" text NOT NULL,
	"document_title" text NOT NULL,
	"locator" text,
	CONSTRAINT "citation_exactly_one_source" CHECK (num_nonnulls("citation"."passage_id", "citation"."qa_entry_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "cluster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"canonical" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cluster_member" (
	"organization_id" text NOT NULL,
	"cluster_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_kind" "event_kind" NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cluster_member_cluster_id_event_id_pk" PRIMARY KEY("cluster_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"title" text NOT NULL,
	"active_version_id" uuid,
	"suspect" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"status" "document_version_status" DEFAULT 'uploading' NOT NULL,
	"failure_reason" text,
	"passage_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"insight_id" uuid NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"summary" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"initiative_id" uuid,
	"transcript" text NOT NULL,
	"screenshot_key" text,
	"clip_key" text,
	"app_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"resolution_class" "resolution_class",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"label" "health_label" NOT NULL,
	"change_summary" text DEFAULT '' NOT NULL,
	"components" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"what_is_changing" text DEFAULT '' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"status" "initiative_status" DEFAULT 'draft' NOT NULL,
	"target_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "initiative_member" (
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	CONSTRAINT "initiative_member_initiative_id_user_id_role_pk" PRIMARY KEY("initiative_id","user_id","role")
);
--> statement-breakpoint
CREATE TABLE "insight" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"title" text NOT NULL,
	"class_answered" integer DEFAULT 0 NOT NULL,
	"class_unanswerable" integer DEFAULT 0 NOT NULL,
	"class_still_stuck" integer DEFAULT 0 NOT NULL,
	"owner_user_id" text,
	"evidence_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_cluster" (
	"organization_id" text NOT NULL,
	"insight_id" uuid NOT NULL,
	"cluster_id" uuid NOT NULL,
	CONSTRAINT "insight_cluster_insight_id_cluster_id_pk" PRIMARY KEY("insight_id","cluster_id")
);
--> statement-breakpoint
CREATE TABLE "insight_thesis" (
	"organization_id" text NOT NULL,
	"insight_id" uuid NOT NULL,
	"thesis_id" uuid NOT NULL,
	"relation" "thesis_relation" NOT NULL,
	CONSTRAINT "insight_thesis_insight_id_thesis_id_pk" PRIMARY KEY("insight_id","thesis_id")
);
--> statement-breakpoint
CREATE TABLE "notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notice_kind" NOT NULL,
	"ref_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "passage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"heading_path" text NOT NULL,
	"locator" integer,
	"text" text NOT NULL,
	"position" integer NOT NULL,
	"embedding" vector(1024),
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "passage"."text")) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"status" "qa_entry_status" DEFAULT 'draft' NOT NULL,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" vector(1024),
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "qa_entry"."question" || ' ' || coalesce("qa_entry"."answer", ''))) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_entry_event" (
	"organization_id" text NOT NULL,
	"qa_entry_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_kind" "event_kind" NOT NULL,
	"user_id" text NOT NULL,
	"source" "qa_link_source" NOT NULL,
	"attached_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qa_entry_event_qa_entry_id_event_id_pk" PRIMARY KEY("qa_entry_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"text" text NOT NULL,
	"resolution_class" "resolution_class",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thesis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"initiative_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"verdict" "thesis_verdict" DEFAULT 'no_evidence' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_flag_id_flag_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation" ADD CONSTRAINT "citation_answer_id_answer_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster" ADD CONSTRAINT "cluster_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_member" ADD CONSTRAINT "cluster_member_cluster_id_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_active_version_id_document_version_id_fk" FOREIGN KEY ("active_version_id") REFERENCES "public"."document_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fix" ADD CONSTRAINT "fix_insight_id_insight_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag" ADD CONSTRAINT "flag_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_snapshot" ADD CONSTRAINT "health_snapshot_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_member" ADD CONSTRAINT "initiative_member_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight" ADD CONSTRAINT "insight_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_cluster" ADD CONSTRAINT "insight_cluster_insight_id_insight_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_cluster" ADD CONSTRAINT "insight_cluster_cluster_id_cluster_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_thesis" ADD CONSTRAINT "insight_thesis_insight_id_insight_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insight"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_thesis" ADD CONSTRAINT "insight_thesis_thesis_id_thesis_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."thesis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage" ADD CONSTRAINT "passage_document_version_id_document_version_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry" ADD CONSTRAINT "qa_entry_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry_event" ADD CONSTRAINT "qa_entry_event_qa_entry_id_qa_entry_id_fk" FOREIGN KEY ("qa_entry_id") REFERENCES "public"."qa_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis" ADD CONSTRAINT "thesis_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_flag_idx" ON "answer" USING btree ("flag_id");--> statement-breakpoint
CREATE INDEX "answer_question_idx" ON "answer" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "citation_answer_ordinal_idx" ON "citation" USING btree ("answer_id","ordinal");--> statement-breakpoint
CREATE INDEX "cluster_org_initiative_idx" ON "cluster" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "cluster_member_event_idx" ON "cluster_member" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "document_org_initiative_idx" ON "document" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "document_version_document_idx" ON "document_version" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "fix_insight_idx" ON "fix" USING btree ("insight_id");--> statement-breakpoint
CREATE INDEX "flag_org_initiative_idx" ON "flag" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "flag_org_user_idx" ON "flag" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "health_snapshot_initiative_computed_idx" ON "health_snapshot" USING btree ("initiative_id","computed_at");--> statement-breakpoint
CREATE INDEX "initiative_org_idx" ON "initiative" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "initiative_member_org_user_idx" ON "initiative_member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "insight_org_initiative_idx" ON "insight" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "insight_cluster_cluster_idx" ON "insight_cluster" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "insight_thesis_thesis_idx" ON "insight_thesis" USING btree ("thesis_id");--> statement-breakpoint
CREATE INDEX "notice_org_user_created_idx" ON "notice" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "passage_org_initiative_idx" ON "passage" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "passage_document_version_idx" ON "passage" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "passage_embedding_hnsw" ON "passage" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "passage_tsv_gin" ON "passage" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "qa_entry_org_initiative_idx" ON "qa_entry" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "qa_entry_embedding_hnsw" ON "qa_entry" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "qa_entry_tsv_gin" ON "qa_entry" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "qa_entry_event_owner_answer_once_idx" ON "qa_entry_event" USING btree ("event_id") WHERE "qa_entry_event"."source" = 'owner_answer';--> statement-breakpoint
CREATE INDEX "qa_entry_event_org_user_idx" ON "qa_entry_event" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "question_org_initiative_idx" ON "question" USING btree ("organization_id","initiative_id");--> statement-breakpoint
CREATE INDEX "question_org_user_idx" ON "question" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "thesis_org_initiative_idx" ON "thesis" USING btree ("organization_id","initiative_id");