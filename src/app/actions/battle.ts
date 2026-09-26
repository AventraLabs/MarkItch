"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { readVideoUrlField } from "@/lib/storage";
import { validateCtaLink } from "@/lib/cta-link";
import { AudioRightsSchema } from "@/lib/validation";

export type UploadBattleVideoFormState = { error?: string } | undefined;

/**
 * Scheduled-mode: one of the two brands in an 'awaiting_videos' battle
 * uploads their side. Once both sides are in, activateBattleIfBothSidesReady
 * opens voting and fires the follower notification.
 *
 * Phase 29: the video itself was already uploaded client-side directly to
 * storage by the time this runs (see video-picker-input.tsx) — this only
 * ever receives the resulting URL, never the file.
 */
export async function uploadBattleVideo(
  _prevState: UploadBattleVideoFormState,
  formData: FormData,
): Promise<UploadBattleVideoFormState> {
  const user = await requireUser();
  const battleId = formData.get("battleId");
  if (typeof battleId !== "string" || !battleId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du hast keine Marke." };
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, battleId)).limit(1);
  if (!battle) {
    return { error: "Dieser Pitch existiert nicht." };
  }

  const isA = battle.brandAId === myBrand.id;
  const isB = battle.brandBId === myBrand.id;
  if (!isA && !isB) {
    return { error: "Das ist nicht dein Pitch." };
  }
  if ((isA && battle.brandAVideoUrl) || (isB && battle.brandBVideoUrl)) {
    return { error: "Du hast für diesen Pitch bereits ein Video hochgeladen." };
  }
  if (battle.productionDeadline && battle.productionDeadline.getTime() < Date.now()) {
    return { error: "Die Frist für diesen Pitch ist abgelaufen." };
  }

  const video = readVideoUrlField(formData, "battle-videos");
  if ("error" in video) {
    return { error: video.error };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { error: Object.values(cta.errors)[0]![0] };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { error: Object.values(audioRights.error.flatten().fieldErrors)[0]![0] };
  }

  const now = new Date();

  await db
    .update(battles)
    .set(
      isA
        ? { brandAVideoUrl: video.videoUrl, brandASubmittedAt: now, brandACtaLabel: cta.ctaLabel, brandACtaUrl: cta.ctaUrl }
        : { brandBVideoUrl: video.videoUrl, brandBSubmittedAt: now, brandBCtaLabel: cta.ctaLabel, brandBCtaUrl: cta.ctaUrl },
    )
    .where(eq(battles.id, battleId));

  await activateBattleIfBothSidesReady(battleId);

  refresh();
  // Phase 30: redirect instead of just returning — the waiting-room page
  // (/pitches/[id]) already shows "eingereicht, warte auf Gegenseite" or
  // bounces straight into the live feed if the other side was already in,
  // so re-rendering it here is exactly the right next screen and also
  // makes a second click impossible (this form unmounts).
  redirect(`/pitches/${battleId}`);
}

// Phase 40: the old "Antworten"/counterWithVideo open-mode path (immediate,
// no accept step, only usable against a brand's legacy videoUrl) is gone —
// folded into the same "Duell einladen" → accept → produce flow as every
// other invite (see actions/challenge.ts's respondToChallenge, which now
// prefills from a brand's legacy videoUrl the same way it already did for
// a solo pitch). One consistent path instead of two different mechanics.
