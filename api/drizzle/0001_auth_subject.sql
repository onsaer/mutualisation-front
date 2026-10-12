ALTER TABLE "users" ADD COLUMN "auth_subject" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_subject_unique" UNIQUE("auth_subject");