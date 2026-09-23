CREATE TABLE "upload_daily_usage" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"bytes" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "upload_daily_usage_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "upload_daily_usage" ADD CONSTRAINT "upload_daily_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_daily_usage_day_index" ON "upload_daily_usage" USING btree ("day");