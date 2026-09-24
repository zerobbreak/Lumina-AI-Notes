CREATE TYPE "public"."announcement_event_kind" AS ENUM('seen', 'dismissed', 'clicked');--> statement-breakpoint
CREATE TABLE "announcement_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"announcement_id" text NOT NULL,
	"kind" "announcement_event_kind" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_events_user_announcement_kind" UNIQUE("user_id","announcement_id","kind")
);
--> statement-breakpoint
ALTER TABLE "announcement_events" ADD CONSTRAINT "announcement_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;