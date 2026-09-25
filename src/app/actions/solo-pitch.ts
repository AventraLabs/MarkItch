"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { readVideoUrlField } from "@/lib/storage";
import { DEFAULT_DUEL_CATEGORY } from "@/lib/battle-format";
import { validateCtaLink } from "@/lib/cta-link";

const MAX_DESCRIPTION_LENGTH = 300;

function readDescription(formData: FormData): { description: string } | { error: string } {
  const raw = formData.get("description");
  const description = typeof raw === "string" ? raw.trim() : "";
  if (!description) return { error: "Bitte eine kurze Beschreibung schreiben." };
  if (description.length > MAX_DESCRIPTION_LENGTH) return { error: `Maximal ${MAX_DESCRIPTION_LENGTH} Zeichen.` };
  return { description };
}

export type SoloPitchFormState = { errors?: Record<string, string[]> } | undefined;

/**
 * Phase 13: post a new solo pitch — a normal, opponent-free feed post. This
 * is the entry point that solves the "a video needs an already-arranged
 * Duell to exist at all" problem (see CLAUDE-CODE-UEBERGABE.md §6): every
 * video starts here, a Duell is something that can happen to it later
 * (challenge or promoted reaction), never a precondition for posting.
 *
 * Phase 29: the video itself was already uploaded client-side directly to
 * storage by the time this runs (see video-picker-input.tsx) — this only
 * ever receives the resulting URL, never the file.
 *
 * Phase 30: redirects straight into the feed on success instead of
 * returning a `success` flag — Luca's report: the form used to just sit
 * there with a green message, submit button clickable again, so a second
 * click posted the same video twice. A `redirect()` unmounts this form
 * entirely (same fix already used by counterWithVideo/promoteReaction), so
 * there's nothing left to double-submit.
 */
export async function postSoloPitch(_prevState: SoloPitchFormState, formData: FormData): Promise<SoloPitchFormState> {
  const user = await requireUser();
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { errors: { _form: ["Du musst zuerst eine Marke erstellen."] } };
  }

  const video = readVideoUrlField(formData, "solo-pitch-videos");
  if ("error" in video) {
    return { errors: { video: [video.error] } };
  }

  const description = readDescription(formData);
  if ("error" in description) {
    return { errors: { description: [description.error] } };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { errors: cta.errors };
  }

  const [pitch] = await db
    .insert(soloPitches)
    .values({
      brandId: myBrand.id,
      videoUrl: video.videoUrl,
      category: DEFAULT_DUEL_CATEGORY,
      description: description.description,
      ctaLabel: cta.ctaLabel,
      ctaUrl: cta.ctaUrl,
    })
    .returning({ id: soloPitches.id });

  refresh();
  // Phase 41: `posted=1` alone reset the scroll position but didn't
  // guarantee the just-posted video was the first thing there — the feed's
  // interleave cadence (see feed.ts's SOLO_INTERLEAVE_EVERY) places even
  // the newest solo pitch at the first *solo* slot, which is the 3rd item
  // overall, not the 1st. Luca: "es ist das letzte gepostete, müsste im
  // Feed sein." Passing its id reuses the existing share-link deep-link
  // mechanism (page.tsx) to pin it to the very top for the poster, without
  // changing how the feed ranks for anyone else.
  redirect(`/?posted=1&pitch=${pitch.id}`);
}

export type UpdateSoloPitchFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

/** Owner-only edit of a solo pitch's caption + CTA link — never the video file itself (re-upload is a new post). */
export async function updateSoloPitch(
  _prevState: UpdateSoloPitchFormState,
  formData: FormData,
): Promise<UpdateSoloPitchFormState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { errors: { _form: ["Ungültige Anfrage."] } };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { errors: { _form: ["Du hast keine Marke."] } };
  }

  const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch || pitch.brandId !== myBrand.id) {
    return { errors: { _form: ["Das ist nicht dein Pitch."] } };
  }

  const description = readDescription(formData);
  if ("error" in description) {
    return { errors: { description: [description.error] } };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { errors: cta.errors };
  }

  await db
    .update(soloPitches)
    .set({ description: description.description, ctaLabel: cta.ctaLabel, ctaUrl: cta.ctaUrl })
    .where(eq(soloPitches.id, soloPitchId));

  refresh();
  return { success: true };
}

export type DeleteSoloPitchState = { error?: string } | undefined;

/** Owner-only self-service delete — separate from the admin moderation removal path (moderation.ts), which needs no ownership check. */
export async function deleteSoloPitch(_prevState: DeleteSoloPitchState, formData: FormData): Promise<DeleteSoloPitchState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du hast keine Marke." };
  }

  const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch || pitch.brandId !== myBrand.id) {
    return { error: "Das ist nicht dein Pitch." };
  }

  await db.delete(soloPitches).where(eq(soloPitches.id, soloPitchId));
  refresh();
  return undefined;
}
