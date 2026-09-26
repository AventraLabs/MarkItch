CREATE TABLE "visitor_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anon_id" text NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_analytics_events" ADD COLUMN "anon_id" text;--> statement-breakpoint
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visitor_events_anon_created_idx" ON "visitor_events" USING btree ("anon_id","created_at");--> statement-breakpoint
CREATE INDEX "visitor_events_kind_created_idx" ON "visitor_events" USING btree ("kind","created_at");