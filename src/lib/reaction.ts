import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { reactions, brands, likes, battles, soloPitches, type Reaction } from "@/db/schema";
import { getExistingOpenBattle } from "@/lib/battle";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { PITCH_CATEGORY } from "@/lib/battle-format";

export type ReactionBrand = { id: string; name: string; slug: string; logoUrl: string | null };

export type ReactionWithBrand = Reaction & {
  brand: ReactionBrand;
  likeCount: number;
  viewerLiked: boolean;
};

const brandCols = { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl };

/** Reactions to a solo pitch, best-liked first — "beste Antwort" per §6. */
export async function getReactionsForSoloPitch(soloPitchId: string, viewerId: string | null): Promise<ReactionWithBrand[]> {
  const rows = await db
    .select({ reaction: reactions, brand: brandCols })
    .from(reactions)
    .innerJoin(brands, eq(reactions.brandId, brands.id))
    .where(eq(reactions.soloPitchId, soloPitchId))
    .orderBy(desc(reactions.createdAt));
  if (rows.length === 0) return [];

  const reactionIds = rows.map((r) => r.reaction.id);
  const [likeCountRows, viewerLikedRows] = await Promise.all([
    db
      .select({ reactionId: likes.reactionId, n: count() })
      .from(likes)
      .where(inArray(likes.reactionId, reactionIds))
      .groupBy(likes.reactionId),
    viewerId
      ? db
          .select({ reactionId: likes.reactionId })
          .from(likes)
          .where(and(eq(likes.userId, viewerId), inArray(likes.reactionId, reactionIds)))
      : Promise.resolve([]),
  ]);
  const likeCountById = new Map(likeCountRows.map((r) => [r.reactionId, r.n]));
  const viewerLikedSet = new Set(viewerLikedRows.map((r) => r.reactionId));

  return rows
    .map((r) => ({
      ...r.reaction,
      brand: r.brand,
      likeCount: likeCountById.get(r.reaction.id) ?? 0,
      viewerLiked: viewerLikedSet.has(r.reaction.id),
    }))
    .sort((a, b) => b.likeCount - a.likeCount || a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getReactionCounts(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: reactions.soloPitchId, n: count() })
    .from(reactions)
    .where(inArray(reactions.soloPitchId, soloPitchIds))
    .groupBy(reactions.soloPitchId);
  return new Map(rows.map((r) => [r.soloPitchId, r.n]));
}

export async function getReactionById(id: string): Promise<Reaction | null> {
  const [row] = await db.select().from(reactions).where(eq(reactions.id, id)).limit(1);
  return row ?? null;
}

/**
 * The original brand upgrades an already-posted, already-liked reaction
 * straight to an official Duell — both videos exist already, so this is
 * exactly the 'open' mode battle.ts/counterWithVideo already knows how to
 * activate, just entered from the other direction (the *original* brand
 * acts, not the reactor). Returns the new battle's id.
 */
export async function promoteReactionToBattle(reactionId: string, actingBrandId: string): Promise<string> {
  const [reaction] = await db.select().from(reactions).where(eq(reactions.id, reactionId)).limit(1);
  if (!reaction) throw new Error("Diese Reaktion existiert nicht.");
  if (reaction.promotedToBattleId) throw new Error("Diese Reaktion ist bereits ein offizielles Duell.");

  const [soloPitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, reaction.soloPitchId)).limit(1);
  if (!soloPitch) throw new Error("Der zugehörige Pitch existiert nicht mehr.");
  if (soloPitch.brandId !== actingBrandId) throw new Error("Nur die Original-Marke kann eine Reaktion hochstufen.");

  const existing = await getExistingOpenBattle(soloPitch.brandId, reaction.brandId);
  if (existing) throw new Error("Zwischen diesen beiden Marken läuft bereits ein Duell.");

  const [battle] = await db
    .insert(battles)
    .values({
      brandAId: soloPitch.brandId,
      brandBId: reaction.brandId,
      mode: "open",
      category: PITCH_CATEGORY,
      brandAVideoUrl: soloPitch.videoUrl,
      brandASubmittedAt: soloPitch.createdAt,
      brandBVideoUrl: reaction.videoUrl,
      brandBSubmittedAt: reaction.createdAt,
    })
    .returning();

  await db.update(reactions).set({ promotedToBattleId: battle.id }).where(eq(reactions.id, reactionId));
  await activateBattleIfBothSidesReady(battle.id);
  return battle.id;
}
