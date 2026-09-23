DROP INDEX "reactions_solo_pitch_brand_unique_idx";--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "parent_reaction_id" uuid;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_parent_reaction_id_reactions_id_fk" FOREIGN KEY ("parent_reaction_id") REFERENCES "public"."reactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_solo_pitch_brand_top_level_unique_idx" ON "reactions" USING btree ("solo_pitch_id","brand_id") WHERE "reactions"."parent_reaction_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_parent_reaction_brand_unique_idx" ON "reactions" USING btree ("parent_reaction_id","brand_id") WHERE "reactions"."parent_reaction_id" is not null;