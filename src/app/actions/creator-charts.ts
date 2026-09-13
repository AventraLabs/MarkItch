"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { postCreatorSubmission } from "@/lib/creator-charts";
import { uploadVideo, ALLOWED_VIDEO_TYPES } from "@/lib/storage";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type PostCreatorVideoFormState = { error?: string; success?: boolean } | undefined;

/**
 * Phase 20: a creator posts the same promo video they'd post on Instagram/
 * TikTok anyway, tagged to the (existing, real-world) partner brand it's
 * about — no call to apply to, no confirmation needed, same "jederzeit,
 * ohne Erlaubnis" spirit as Reaktionen. It joins that brand's current
 * month's chart automatically (see currentPeriod() in
 * src/lib/creator-charts.ts).
 */
export async function postCreatorVideo(
  _prevState: PostCreatorVideoFormState,
  formData: FormData,
): Promise<PostCreatorVideoFormState> {
  const user = await requireUser();
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen." };
  }

  const targetBrandId = formData.get("targetBrandId");
  if (typeof targetBrandId !== "string" || !targetBrandId) {
    return { error: "Bitte wähle die Marke aus, für die das Video ist." };
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

  const { allowed } = await checkRateLimit("creator-submit", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const uploaded = await uploadVideo(file, "creator-videos");
  const result = await postCreatorSubmission(myBrand.id, targetBrandId, uploaded.url);
  if (result.error) return { error: result.error };

  refresh();
  return { success: true };
}
