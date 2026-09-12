CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solo_pitch_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"promoted_to_battle_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solo_pitches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "battle_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "likes" ALTER COLUMN "battle_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "solo_pitch_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "solo_pitch_id" uuid;--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN "solo_pitch_id" uuid;--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN "reaction_id" uuid;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_promoted_to_battle_id_battles_id_fk" FOREIGN KEY ("promoted_to_battle_id") REFERENCES "public"."battles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solo_pitches" ADD CONSTRAINT "solo_pitches_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_solo_pitch_brand_unique_idx" ON "reactions" USING btree ("solo_pitch_id","brand_id");--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_solo_pitch_id_solo_pitches_id_fk" FOREIGN KEY ("solo_pitch_id") REFERENCES "public"."solo_pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_reaction_id_reactions_id_fk" FOREIGN KEY ("reaction_id") REFERENCES "public"."reactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "likes_solo_pitch_user_unique_idx" ON "likes" USING btree ("solo_pitch_id","user_id") WHERE "likes"."solo_pitch_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "likes_reaction_user_unique_idx" ON "likes" USING btree ("reaction_id","user_id") WHERE "likes"."reaction_id" is not null;