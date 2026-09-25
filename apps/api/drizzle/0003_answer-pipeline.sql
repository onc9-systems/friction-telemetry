CREATE TABLE "pipeline_trace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"event_kind" "event_kind" NOT NULL,
	"event_id" uuid NOT NULL,
	"answer_id" uuid NOT NULL,
	"jev_model" text,
	"trace" jsonb NOT NULL,
	"degraded" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suspect_mark" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"document_id" uuid,
	"qa_entry_id" uuid,
	"passage_id" uuid,
	"event_kind" "event_kind" NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "answer" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "answer" ADD COLUMN "band" text;--> statement-breakpoint
ALTER TABLE "answer" ADD COLUMN "others_count" integer;--> statement-breakpoint
ALTER TABLE "answer" ADD COLUMN "initiative_id" uuid;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "char_offset" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "source_kind" text DEFAULT 'document' NOT NULL;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "heading_path" text;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "passage_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "qa_approved_by_user_id" text;--> statement-breakpoint
ALTER TABLE "citation" ADD COLUMN "qa_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "file_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "uploaded_by_user_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "warning" text;--> statement-breakpoint
ALTER TABLE "document_version" ADD COLUMN "status_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "flag" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "flag" ADD COLUMN "initiative_confidence" real;--> statement-breakpoint
ALTER TABLE "flag" ADD COLUMN "routed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "flag" ADD COLUMN "still_stuck_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "flag" ADD COLUMN "still_stuck_reason" text;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "initiative_confidence" real;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "routed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "still_stuck_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "still_stuck_reason" text;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "in_reply_to_kind" "event_kind";--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "in_reply_to_id" uuid;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "thread_root_kind" "event_kind";--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "thread_root_id" uuid;--> statement-breakpoint
ALTER TABLE "question" ADD COLUMN "standalone_text" text;--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_trace_answer_idx" ON "pipeline_trace" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX "pipeline_trace_event_idx" ON "pipeline_trace" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "suspect_mark_document_idx" ON "suspect_mark" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "suspect_mark_event_idx" ON "suspect_mark" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "answer" ADD CONSTRAINT "answer_initiative_id_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flag_embedding_hnsw" ON "flag" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "question_embedding_hnsw" ON "question" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "question_thread_root_idx" ON "question" USING btree ("thread_root_id");--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_reply_pair" CHECK (num_nonnulls("question"."in_reply_to_kind", "question"."in_reply_to_id") in (0, 2));--> statement-breakpoint
-- Filtered HNSW scans can return fewer rows than asked; iterative scans (pgvector 0.8.0+) keep scanning.
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET hnsw.iterative_scan = relaxed_order', current_database()); END $$;
