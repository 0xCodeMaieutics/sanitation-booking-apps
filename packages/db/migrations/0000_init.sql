CREATE TYPE "public"."actor" AS ENUM('client', 'admin');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('booked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."callback_request_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."verification_purpose" AS ENUM('client', 'admin_sign_in');--> statement-breakpoint
CREATE TABLE "admin_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_session_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"custom_service" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_hours" smallint NOT NULL,
	"price_gel" integer,
	"status" "booking_status" DEFAULT 'booked' NOT NULL,
	"client_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" "actor" NOT NULL,
	"callback_request_id" uuid,
	"manage_token_hash" text NOT NULL,
	"ended_at" timestamp with time zone,
	"cancelled_by" "actor",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_callbackRequestId_unique" UNIQUE("callback_request_id"),
	CONSTRAINT "booking_manageTokenHash_unique" UNIQUE("manage_token_hash"),
	CONSTRAINT "booking_service_or_custom" CHECK (("booking"."service_id" is null) <> ("booking"."custom_service" is null)),
	CONSTRAINT "booking_duration" CHECK ("booking"."duration_hours" between 1 and 12),
	CONSTRAINT "booking_price" CHECK ("booking"."price_gel" is null or "booking"."price_gel" >= 0),
	CONSTRAINT "booking_ended" CHECK (("booking"."status" = 'booked') = ("booking"."ended_at" is null)),
	CONSTRAINT "booking_cancelled_by" CHECK (("booking"."status" = 'cancelled') = ("booking"."cancelled_by" is not null))
);
--> statement-breakpoint
CREATE TABLE "callback_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"desired_starts_at" timestamp with time zone,
	"status" "callback_request_status" DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "callback_request_service" (
	"callback_request_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "callback_request_service_callback_request_id_service_id_pk" PRIMARY KEY("callback_request_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "phone_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" "verification_purpose" NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_hours" smallint NOT NULL,
	"price_gel" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_duration" CHECK ("service"."duration_hours" between 1 and 12),
	CONSTRAINT "service_price" CHECK ("service"."price_gel" >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_notice_hours" smallint DEFAULT 2 NOT NULL,
	"working_days" smallint[] DEFAULT '{1,2,3,4,5,6,7}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_min_notice" CHECK ("settings"."min_notice_hours" between 0 and 72)
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_off_range" CHECK ("time_off"."ends_at" > "time_off"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_callback_request_id_callback_request_id_fk" FOREIGN KEY ("callback_request_id") REFERENCES "public"."callback_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callback_request_service" ADD CONSTRAINT "callback_request_service_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callback_request_service" ADD CONSTRAINT "callback_request_service_request_fk" FOREIGN KEY ("callback_request_id") REFERENCES "public"."callback_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_starts_at_index" ON "booking" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "callback_request_status_desired_starts_at_index" ON "callback_request" USING btree ("status","desired_starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "callback_request_one_pending_pause_per_phone" ON "callback_request" USING btree ("phone") WHERE "callback_request"."status" = 'pending' and "callback_request"."desired_starts_at" is not null;--> statement-breakpoint
CREATE INDEX "phone_verification_phone_created_at_index" ON "phone_verification" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "phone_verification_ip_address_created_at_index" ON "phone_verification" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "time_off_starts_at_index" ON "time_off" USING btree ("starts_at");