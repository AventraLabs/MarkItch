"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { reactions, soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { promoteReactionToBattle } from "@/lib/reaction";
import { readVideoUrlField } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AudioRightsSchema } from "@/lib/validation";

export type ReactionFormState = { error?: string } | undefined;

/**
 * Phase 13: any brand reacts to a solo pitch, no permission needed — never
 * on a battle side (see CLAUDE-CODE-UEBERGABE.md §6).
 *
 * Phase 40: a reaction can now optionally reply to another reaction
 * (`parentReactionId`) instead of only ever the pitch itself, so two
 * brands can go back and forth ("Coke vs. Pepsi") — see schema.ts's
 * comment on the `reactions` table for the two unique indexes this relies
 * on. When replying, `soloPitchId` is re-derived from the parent reaction
 * rather than trusted from the form, so the denormalized root can't drift.
 *
 * Bugfix: the old existence check queried *any* reaction on this pitch,
 * not this brand's own — which meant only the very first brand to react
 * to a given pitch could ever do so via this form at all (the unique index
 * itself was still per-brand and never actually hit).
 */
export async function postReaction(_prevState: ReactionFormState, formData: FormData): Promise<ReactionFormState> {
  const user = await requireUser();
  const soloPitchIdInput = formData.get("soloPitchId");
  const parentReactionIdInput = formData.get("parentReactionId");
  if (typeof soloPitchIdInput !== "string" || !soloPitchIdInput) {
    return { error: "Ungültige Anfrage." };
  }
  const parentReactionId = typeof parentReactionIdInput === "string" && parentReactionIdInput ? parentReactionIdInput : null;

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um zu reagieren." };
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchIdInput)).limit(1);
  if (!pitch) {
    return { error: "Dieser Pitch existiert nicht." };
  }

  let soloPitchId = pitch.id;
  if (parentReactionId) {
    const [parent] = await db.select().from(reactions).where(eq(reactions.id, parentReactionId)).limit(1);
    if (!parent) {
      return { error: "Diese Reaktion existiert nicht mehr." };
    }
    if (parent.brandId === myBrand.id) {
      return { error: "Du kannst nicht auf deine eigene Reaktion antworten." };
    }
    soloPitchId = parent.soloPitchId;
  } else if (pitch.brandId === myBrand.id) {
    return { error: "Du kannst nicht auf deinen eigenen Pitch reagieren." };
  }

  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      parentReactionId
        ? and(eq(reactions.parentReactionId, parentReactionId), eq(reactions.brandId, myBrand.id))
        : and(eq(reactions.soloPitchId, soloPitchId), isNull(reactions.parentReactionId), eq(reactions.brandId, myBrand.id)),
    );
  if (existing) {
    return { error: parentReactionId ? "Du hast auf diese Reaktion bereits geantwortet." : "Du hast auf diesen Pitch bereits reagiert." };
  }

  const { allowed } = await checkRateLimit("reaction", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const video = readVideoUrlField(formData, "reaction-videos");
  if ("error" in video) {
    return { error: video.error };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { error: Object.values(audioRights.error.flatten().fieldErrors)[0]![0] };
  }

  await db.insert(reactions).values({ soloPitchId, parentReactionId, brandId: myBrand.id, videoUrl: video.videoUrl });

  refresh();
  return undefined;
}

export type PromoteReactionFormState = { error?: string } | undefined;

/** The original brand upgrades a reaction straight to an official Duell. */
export async function promoteReaction(
  _prevState: PromoteReactionFormState,
  formData: FormData,
): Promise<PromoteReactionFormState> {
  const user = await requireUser();
  const reactionId = formData.get("reactionId");
  if (typeof reactionId !== "string" || !reactionId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du hast keine Marke." };
  }

  let battleId: string;
  try {
    battleId = await promoteReactionToBattle(reactionId, myBrand.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Hochstufen fehlgeschlagen." };
  }

  redirect(`/pitches/${battleId}`);
}
