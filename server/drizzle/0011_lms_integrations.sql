CREATE TYPE "public"."deadline_source" AS ENUM('manual', 'brightspace');--> statement-breakpoint
CREATE TYPE "public"."lms_connection_kind" AS ENUM('ical', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."lms_connection_status" AS ENUM('active', 'error');--> statement-breakpoint
CREATE TYPE "public"."lms_provider" AS ENUM('brightspace');--> statement-breakpoint
CREATE TABLE "lms_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"provider" "lms_provider" NOT NULL,
	"kind" "lms_connection_kind" NOT NULL,
	"host" text NOT NULL,
	"secret" text NOT NULL,
	"secret_expires_at" timestamp with time zone,
	"external_user_id" text,
	"status" "lms_connection_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lms_connections_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "lms_course_links" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"external_key" text NOT NULL,
	"external_name" text NOT NULL,
	"course_id" text,
	"ignored" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lms_course_links_connection_key" UNIQUE("connection_id","external_key")
);
--> statement-breakpoint
ALTER TABLE "deadlines" ADD COLUMN "source" "deadline_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "deadlines" ADD COLUMN "connection_id" text;--> statement-breakpoint
ALTER TABLE "deadlines" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "deadlines" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "lms_connections" ADD CONSTRAINT "lms_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_course_links" ADD CONSTRAINT "lms_course_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_course_links" ADD CONSTRAINT "lms_course_links_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lms_course_links_user_id_index" ON "lms_course_links" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_connection_id_lms_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."lms_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_connection_external" UNIQUE("connection_id","external_id");