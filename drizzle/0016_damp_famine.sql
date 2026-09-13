CREATE TABLE "creator_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"creator_brand_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"period" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_submissions" ADD CONSTRAINT "creator_submissions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_submissions" ADD CONSTRAINT "creator_submissions_creator_brand_id_brands_id_fk" FOREIGN KEY ("creator_brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_votes" ADD CONSTRAINT "creator_votes_submission_id_creator_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."creator_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_votes" ADD CONSTRAINT "creator_votes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_votes" ADD CONSTRAINT "creator_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_votes_brand_period_user_unique_idx" ON "creator_votes" USING btree ("brand_id","period","user_id");