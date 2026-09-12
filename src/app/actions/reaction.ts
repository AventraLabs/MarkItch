"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { reactions, soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { promoteReactionToBattle } from "@/lib/reaction";
import { uploadVideo, ALLOWED_VIDEO_TYPES } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type ReactionFormState = { error?: string } | undefined;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Phase 13: any brand reacts to a solo pitch, no permission needed — never
 * on a battle side (see CLAUDE-CODE-UEBERGABE.md §6). One reaction per
 * brand per pitch (reactions_solo_pitch_brand_unique_idx in schema.ts is
 * the real backstop; checked here first for a friendly error).
 */
export async function postReaction(_prevState: ReactionFormState, formData: FormData): Promise<ReactionFormState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um zu reagieren." };
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) {
    return { error: "Dieser Pitch existiert nicht." };
  }
  if (pitch.brandId === myBrand.id) {
    return { error: "Du kannst nicht auf deinen eigenen Pitch reagieren." };
  }

  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(eq(reactions.soloPitchId, soloPitchId));
  if (existing) {
    return { error: "Du hast auf diesen Pitch bereits reagiert." };
  }

  const { allowed } = await checkRateLimit("reaction", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const file = formData.get("video");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte ein Video auswählen." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { error: "Video darf maximal 50 MB groß sein." };
  }
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { error: "Erlaubt: MP4, WEBM oder MOV." };
  }

  const uploaded = await uploadVideo(file, "reaction-videos");
  await db.insert(reactions).values({ soloPitchId, brandId: myBrand.id, videoUrl: uploaded.url });

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
