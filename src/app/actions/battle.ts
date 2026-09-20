"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { battles, brands } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getExistingOpenBattle } from "@/lib/battle";
import { activateBattleIfBothSidesReady } from "@/lib/battle-stage";
import { readVideoUrlField } from "@/lib/storage";
import { PITCH_CATEGORY } from "@/lib/battle-format";
import { validateCtaLink } from "@/lib/cta-link";

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

export type CounterFormState = { error?: string } | undefined;

/**
 * Open-mode: any brand can counter another brand's public showcase video
 * with their own — no permission needed. This is what lets a brand nobody
 * has challenged (a new startup, say) get into a battle on its own
 * initiative, rather than waiting to be picked.
 */
export async function counterWithVideo(_prevState: CounterFormState, formData: FormData): Promise<CounterFormState> {
  const user = await requireUser();
  const targetBrandId = formData.get("targetBrandId");
  if (typeof targetBrandId !== "string" || !targetBrandId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um zu antworten." };
  }
  if (myBrand.id === targetBrandId) {
    return { error: "Du kannst deine eigene Marke nicht selbst beantworten." };
  }

  const [targetBrand] = await db.select().from(brands).where(eq(brands.id, targetBrandId)).limit(1);
  if (!targetBrand || !targetBrand.videoUrl) {
    return { error: "Diese Marke hat noch kein Video zum Antworten." };
  }

  const existing = await getExistingOpenBattle(targetBrandId, myBrand.id);
  if (existing) {
    return { error: "Du hast auf diese Marke bereits geantwortet." };
  }

  const video = readVideoUrlField(formData, "battle-videos");
  if ("error" in video) {
    return { error: video.error };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { error: Object.values(cta.errors)[0]![0] };
  }

  const now = new Date();

  const [battle] = await db
    .insert(battles)
    .values({
      brandAId: targetBrandId,
      brandBId: myBrand.id,
      mode: "open",
      category: PITCH_CATEGORY,
      // Snapshotted, not live-referenced — if targetBrand later replaces
      // their profile video, this battle keeps showing what was actually
      // countered. No CTA snapshot for this side (see schema.ts) — the
      // display layer falls back to the brand's own `website` instead.
      brandAVideoUrl: targetBrand.videoUrl,
      brandASubmittedAt: targetBrand.videoUploadedAt ?? now,
      brandBVideoUrl: video.videoUrl,
      brandBSubmittedAt: now,
      brandBCtaLabel: cta.ctaLabel,
      brandBCtaUrl: cta.ctaUrl,
    })
    .returning();

  await activateBattleIfBothSidesReady(battle.id);

  // Straight to the new battle — the countering brand should see their
  // shot land immediately, not just a success message on the old page.
  redirect(`/pitches/${battle.id}`);
}
