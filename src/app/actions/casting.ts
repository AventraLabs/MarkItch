"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { createCasting, getActiveCastingForBrand, submitToCasting } from "@/lib/casting";
import { uploadVideo, ALLOWED_VIDEO_TYPES } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 200;

export type StartCastingFormState = { error?: string } | undefined;

/**
 * Phase 19: a brand opens a "Partner-Casting" — a call for other brands
 * (creators/influencers running their own brand profile) to submit a pitch
 * video. Deliberately no video from the host here — starting a casting is
 * just the call, not an entry (see CLAUDE-CODE-UEBERGABE.md's Ideen-Backlog
 * for the concept). One active casting per brand at a time, to keep a
 * brand's profile page simple rather than juggling several running calls.
 */
export async function startCasting(_prevState: StartCastingFormState, formData: FormData): Promise<StartCastingFormState> {
  const user = await requireUser();
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen." };
  }

  const existing = await getActiveCastingForBrand(myBrand.id);
  if (existing) {
    return { error: "Du hast bereits ein laufendes Casting." };
  }

  const rawPrompt = formData.get("prompt");
  const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
  if (!prompt) {
    return { error: "Bitte beschreibe kurz, wen du suchst." };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { error: `Maximal ${MAX_PROMPT_LENGTH} Zeichen.` };
  }

  const { allowed } = await checkRateLimit("casting-start", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  await createCasting(myBrand.id, prompt);
  refresh();
  return undefined;
}

export type SubmitCastingFormState = { error?: string } | undefined;

export async function submitCastingEntry(
  _prevState: SubmitCastingFormState,
  formData: FormData,
): Promise<SubmitCastingFormState> {
  const user = await requireUser();
  const castingId = formData.get("castingId");
  if (typeof castingId !== "string" || !castingId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um mitzumachen." };
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

  const { allowed } = await checkRateLimit("casting-submit", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const uploaded = await uploadVideo(file, "casting-videos");
  const result = await submitToCasting(castingId, myBrand.id, uploaded.url);
  if (result.error) return { error: result.error };

  refresh();
  return undefined;
}
