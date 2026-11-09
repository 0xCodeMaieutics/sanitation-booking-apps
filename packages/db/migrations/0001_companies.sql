-- No Company used the app before Companies existed, so existing rows are discarded rather than assigned to one.
TRUNCATE "admin_session", "booking", "callback_request_service", "callback_request", "service", "settings", "time_off", "phone_verification";--> statement-breakpoint
CREATE TABLE "admin_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"alerts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_phone_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_slug" (
	"slug" text PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "booking_starts_at_index";--> statement-breakpoint
DROP INDEX "callback_request_status_desired_starts_at_index";--> statement-breakpoint
DROP INDEX "time_off_starts_at_index";--> statement-breakpoint
DROP INDEX "callback_request_one_pending_pause_per_phone";--> statement-breakpoint
ALTER TABLE "admin_session" ADD COLUMN "admin_phone_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "callback_request" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "time_off" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_phone" ADD CONSTRAINT "admin_phone_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_slug" ADD CONSTRAINT "company_slug_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_admin_phone_id_admin_phone_id_fk" FOREIGN KEY ("admin_phone_id") REFERENCES "public"."admin_phone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callback_request" ADD CONSTRAINT "callback_request_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_company_id_starts_at_index" ON "booking" USING btree ("company_id","starts_at");--> statement-breakpoint
CREATE INDEX "callback_request_company_id_status_desired_starts_at_index" ON "callback_request" USING btree ("company_id","status","desired_starts_at");--> statement-breakpoint
CREATE INDEX "service_company_id_index" ON "service" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "time_off_company_id_starts_at_index" ON "time_off" USING btree ("company_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "callback_request_one_pending_pause_per_phone" ON "callback_request" USING btree ("company_id","phone") WHERE "callback_request"."status" = 'pending' and "callback_request"."desired_starts_at" is not null;--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_single_row";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "settings" ADD PRIMARY KEY ("company_id");