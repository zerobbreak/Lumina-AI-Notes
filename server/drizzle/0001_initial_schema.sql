CREATE TYPE "public"."collaborator_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TYPE "public"."chat_mode" AS ENUM('explain', 'synthesize', 'compare', 'apply', 'quiz', 'fill_gaps');--> statement-breakpoint
CREATE TYPE "public"."deadline_kind" AS ENUM('assignment', 'exam', 'event', 'task');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('deadline_reminder');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"major" text,
	"semester" text,
	"courses" jsonb,
	"note_style" text,
	"theme" text,
	"enabled_blocks" text[],
	"monthly_usage" jsonb,
	"current_streak" integer,
	"longest_streak" integer,
	"last_studied_date" timestamp with time zone,
	"last_timezone_offset_minutes" integer,
	"badges" text[],
	"daily_goal_minutes" integer,
	"daily_goal_cards" integer,
	"tour_completed" boolean DEFAULT false NOT NULL,
	"tour_step" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerkUserId_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"storage_key" text NOT NULL,
	"course_id" text NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"storage_key" text,
	"content_type" text,
	"size_bytes" bigint,
	"course_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"extracted_text" text,
	"summary" text,
	"key_topics" text[],
	"embedding" vector(768),
	"processing_status" text,
	"processed_at" timestamp with time zone,
	"queue_position" integer,
	"progress_percent" double precision,
	"error_message" text,
	"search_name" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"transcript" text NOT NULL,
	"audio_url" text,
	"audio_storage_key" text,
	"duration" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_linked_files" (
	"note_id" text NOT NULL,
	"file_id" text NOT NULL,
	CONSTRAINT "note_linked_files_note_id_file_id_pk" PRIMARY KEY("note_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "note_tags" (
	"note_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "note_tags_note_id_tag_id_pk" PRIMARY KEY("note_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"note_type" text,
	"major" text,
	"course_id" text,
	"module_id" text,
	"parent_note_id" text,
	"style" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"embedding" vector(768),
	"auto_tag_attempted" boolean DEFAULT false NOT NULL,
	"word_count" integer,
	"quick_capture_type" text,
	"quick_capture_audio_url" text,
	"quick_capture_status" text,
	"quick_capture_expanded_note_id" text,
	"outline_data" text,
	"outline_metadata" jsonb,
	"source_recording_id" text,
	"search_title" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED,
	"search_content" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_userId_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "note_collaborators" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"note_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "collaborator_role" NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text,
	CONSTRAINT "note_collaborators_noteId_userId_unique" UNIQUE("note_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "note_invites" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"note_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "collaborator_role" NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	CONSTRAINT "note_invites_noteId_email_unique" UNIQUE("note_id","email")
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"note_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_image" text,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presence_userId_noteId_unique" UNIQUE("user_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "flashcard_decks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source_note_id" text,
	"course_id" text,
	"card_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_studied_at" timestamp with time zone,
	"exam_date" timestamp with time zone,
	"search_title" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "flashcard_review_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"deck_id" text NOT NULL,
	"card_id" text NOT NULL,
	"rating" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard_review_queues" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"card_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcard_review_queues_userId_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text,
	"deck_id" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"difficulty" double precision,
	"next_review_at" timestamp with time zone,
	"review_count" integer,
	"last_reviewed_at" timestamp with time zone,
	"ease_factor" double precision,
	"interval" double precision,
	"repetitions" integer,
	"last_rating" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_decks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"source_note_id" text,
	"course_id" text,
	"question_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_taken_at" timestamp with time zone,
	"search_title" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"deck_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"question" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_answer" integer NOT NULL,
	"explanation" text,
	"difficulty" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"deck_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"answers" integer[] NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_spent" double precision
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"context_note_ids" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"pinned_note_ids" text[],
	"mode" "chat_mode",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadline_reminders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"deadline_id" text NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"kind" "deadline_kind" NOT NULL,
	"course_id" text,
	"module_id" text,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_linked_files" ADD CONSTRAINT "note_linked_files_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_linked_files" ADD CONSTRAINT "note_linked_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_parent_note_id_notes_id_fk" FOREIGN KEY ("parent_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_quick_capture_expanded_note_id_notes_id_fk" FOREIGN KEY ("quick_capture_expanded_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_source_recording_id_recordings_id_fk" FOREIGN KEY ("source_recording_id") REFERENCES "public"."recordings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_invites" ADD CONSTRAINT "note_invites_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_invites" ADD CONSTRAINT "note_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_invites" ADD CONSTRAINT "note_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_events" ADD CONSTRAINT "flashcard_review_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_events" ADD CONSTRAINT "flashcard_review_events_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_events" ADD CONSTRAINT "flashcard_review_events_card_id_flashcards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_review_queues" ADD CONSTRAINT "flashcard_review_queues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_deck_id_flashcard_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_decks" ADD CONSTRAINT "quiz_decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_decks" ADD CONSTRAINT "quiz_decks_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_deck_id_quiz_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."quiz_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_deck_id_quiz_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."quiz_decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_reminders" ADD CONSTRAINT "deadline_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadline_reminders" ADD CONSTRAINT "deadline_reminders_deadline_id_deadlines_id_fk" FOREIGN KEY ("deadline_id") REFERENCES "public"."deadlines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_index" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "documents_storage_key_index" ON "documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "documents_course_id_index" ON "documents" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "documents_embedding_idx" ON "documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "files_user_id_course_id_index" ON "files" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "files_user_id_created_at_index" ON "files" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "files_user_id_last_accessed_at_index" ON "files" USING btree ("user_id","last_accessed_at");--> statement-breakpoint
CREATE INDEX "files_processing_status_index" ON "files" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "files_search_name_idx" ON "files" USING gin ("search_name");--> statement-breakpoint
CREATE INDEX "files_embedding_idx" ON "files" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "recordings_user_id_session_id_index" ON "recordings" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "recordings_user_id_created_at_index" ON "recordings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "note_linked_files_file_id_index" ON "note_linked_files" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "note_tags_tag_id_index" ON "note_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_created_at_index" ON "notes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notes_user_id_last_accessed_at_index" ON "notes" USING btree ("user_id","last_accessed_at");--> statement-breakpoint
CREATE INDEX "notes_user_id_source_recording_id_index" ON "notes" USING btree ("user_id","source_recording_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_is_pinned_index" ON "notes" USING btree ("user_id","is_pinned");--> statement-breakpoint
CREATE INDEX "notes_user_id_is_archived_index" ON "notes" USING btree ("user_id","is_archived");--> statement-breakpoint
CREATE INDEX "notes_user_id_note_type_index" ON "notes" USING btree ("user_id","note_type");--> statement-breakpoint
CREATE INDEX "notes_course_id_index" ON "notes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "notes_module_id_index" ON "notes" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "notes_parent_note_id_index" ON "notes" USING btree ("parent_note_id");--> statement-breakpoint
CREATE INDEX "notes_search_title_idx" ON "notes" USING gin ("search_title");--> statement-breakpoint
CREATE INDEX "notes_search_content_idx" ON "notes" USING gin ("search_content");--> statement-breakpoint
CREATE INDEX "notes_embedding_idx" ON "notes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "note_collaborators_user_id_index" ON "note_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_invites_email_index" ON "note_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "presence_note_id_index" ON "presence" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "presence_last_seen_index" ON "presence" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "flashcard_decks_user_id_index" ON "flashcard_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flashcard_decks_search_title_idx" ON "flashcard_decks" USING gin ("search_title");--> statement-breakpoint
CREATE INDEX "flashcard_review_events_user_id_reviewed_at_index" ON "flashcard_review_events" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_events_deck_id_reviewed_at_index" ON "flashcard_review_events" USING btree ("deck_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "flashcard_review_events_card_id_index" ON "flashcard_review_events" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "flashcards_deck_id_next_review_at_index" ON "flashcards" USING btree ("deck_id","next_review_at");--> statement-breakpoint
CREATE INDEX "flashcards_deck_id_position_index" ON "flashcards" USING btree ("deck_id","position");--> statement-breakpoint
CREATE INDEX "flashcards_user_id_next_review_at_index" ON "flashcards" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "quiz_decks_user_id_index" ON "quiz_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_decks_search_title_idx" ON "quiz_decks" USING gin ("search_title");--> statement-breakpoint
CREATE INDEX "quiz_questions_deck_id_position_index" ON "quiz_questions" USING btree ("deck_id","position");--> statement-breakpoint
CREATE INDEX "quiz_results_user_id_deck_id_index" ON "quiz_results" USING btree ("user_id","deck_id");--> statement-breakpoint
CREATE INDEX "quiz_results_user_id_completed_at_index" ON "quiz_results" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "quiz_results_deck_id_completed_at_index" ON "quiz_results" USING btree ("deck_id","completed_at");--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_created_at_index" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_updated_at_index" ON "chat_sessions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "deadline_reminders_user_id_remind_at_index" ON "deadline_reminders" USING btree ("user_id","remind_at");--> statement-breakpoint
CREATE INDEX "deadline_reminders_deadline_id_index" ON "deadline_reminders" USING btree ("deadline_id");--> statement-breakpoint
CREATE INDEX "deadline_reminders_due_idx" ON "deadline_reminders" USING btree ("remind_at") WHERE "deadline_reminders"."sent_at" is null;--> statement-breakpoint
CREATE INDEX "deadlines_user_id_due_at_index" ON "deadlines" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "deadlines_user_id_completed_at_index" ON "deadlines" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_index" ON "notifications" USING btree ("user_id","read_at");