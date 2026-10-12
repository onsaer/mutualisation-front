CREATE TYPE "public"."booking_status" AS ENUM('en_attente', 'confirmee', 'refusee', 'annulee', 'en_cours', 'terminee', 'litige');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('brouillon', 'publiee', 'suspendue', 'archivee');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('materiel', 'espace', 'achat_groupe');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('pro', 'particulier');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"owner_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"requester_role" "user_role" NOT NULL,
	"status" "booking_status" DEFAULT 'en_attente' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"quantity" integer,
	"total_price_cents" integer,
	"deposit_cents" integer,
	"history" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_kind_check" CHECK (("bookings"."resource_type" = 'achat_groupe' AND "bookings"."quantity" > 0 AND "bookings"."period_start" IS NULL)
        OR ("bookings"."resource_type" <> 'achat_groupe' AND "bookings"."period_start" < "bookings"."period_end" AND "bookings"."quantity" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "resource_type" NOT NULL,
	"owner_id" text NOT NULL,
	"owner_role" "user_role" NOT NULL,
	"audience" "user_role"[] NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photo_urls" text[] DEFAULT '{}' NOT NULL,
	"address" jsonb NOT NULL,
	"postal_code" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"status" "resource_status" DEFAULT 'publiee' NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"display_name" text NOT NULL,
	"address" jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"preferred_language" text NOT NULL,
	"company" jsonb,
	"first_name" text,
	"last_name" text,
	"neighbourhood_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_resource_idx" ON "bookings" USING btree ("resource_id","status");--> statement-breakpoint
CREATE INDEX "bookings_owner_idx" ON "bookings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bookings_requester_idx" ON "bookings" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "resources_type_status_idx" ON "resources" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "resources_owner_idx" ON "resources" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resources_postal_code_idx" ON "resources" USING btree ("postal_code");