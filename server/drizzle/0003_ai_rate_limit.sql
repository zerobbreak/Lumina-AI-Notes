CREATE TABLE "ai_rate_limit_windows" (
	"user_id" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_rate_limit_windows_user_id_window_start_pk" PRIMARY KEY("user_id","window_start")
);
--> statement-breakpoint
ALTER TABLE "ai_rate_limit_windows" ADD CONSTRAINT "ai_rate_limit_windows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_rate_limit_windows_window_start_index" ON "ai_rate_limit_windows" USING btree ("window_start");