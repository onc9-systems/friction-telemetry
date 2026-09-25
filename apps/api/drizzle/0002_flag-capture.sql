CREATE TYPE "public"."capture_part_kind" AS ENUM('video', 'audio');--> statement-breakpoint
CREATE TYPE "public"."capture_part_status" AS ENUM('uploading', 'received');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('waiting', 'transcribing', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "flag_capture" (
	"flag_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"clicked_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"screen" jsonb,
	"windows" jsonb NOT NULL,
	"transcript_status" "transcript_status" DEFAULT 'waiting' NOT NULL,
	"transcript" text,
	"transcript_words" jsonb,
	"transcript_error" text,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag_capture_part" (
	"flag_id" uuid NOT NULL,
	"kind" "capture_part_kind" NOT NULL,
	"organization_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"upload_id" text NOT NULL,
	"status" "capture_part_status" DEFAULT 'uploading' NOT NULL,
	"received_at" timestamp with time zone,
	CONSTRAINT "flag_capture_part_flag_id_kind_pk" PRIMARY KEY("flag_id","kind")
);
--> statement-breakpoint
ALTER TABLE "flag_capture_part" ADD CONSTRAINT "flag_capture_part_flag_id_flag_capture_flag_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."flag_capture"("flag_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flag_capture_org_registered_idx" ON "flag_capture" USING btree ("organization_id","registered_at");