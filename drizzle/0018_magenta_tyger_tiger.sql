CREATE TABLE "boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"solo_pitch_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;