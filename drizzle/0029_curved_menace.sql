ALTER TABLE "battles" ADD COLUMN "brand_a_contains_ai_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "brand_b_contains_ai_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "casting_submissions" ADD COLUMN "contains_ai_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_submissions" ADD COLUMN "contains_ai_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "contains_ai_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD COLUMN "contains_ai_content" boolean DEFAULT false NOT NULL;