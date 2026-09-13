CREATE TABLE "casting_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"casting_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casting_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"casting_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_castings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_brand_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"submission_deadline" timestamp with time zone NOT NULL,
	"voting_ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD CONSTRAINT "casting_submissions_casting_id_partner_castings_id_fk" FOREIGN KEY ("casting_id") REFERENCES "public"."partner_castings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD CONSTRAINT "casting_submissions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_votes" ADD CONSTRAINT "casting_votes_casting_id_partner_castings_id_fk" FOREIGN KEY ("casting_id") REFERENCES "public"."partner_castings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_votes" ADD CONSTRAINT "casting_votes_submission_id_casting_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."casting_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_votes" ADD CONSTRAINT "casting_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_castings" ADD CONSTRAINT "partner_castings_host_brand_id_brands_id_fk" FOREIGN KEY ("host_brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "casting_submissions_casting_brand_unique_idx" ON "casting_submissions" USING btree ("casting_id","brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "casting_votes_casting_user_unique_idx" ON "casting_votes" USING btree ("casting_id","user_id");