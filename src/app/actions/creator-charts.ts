"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { postCreatorSubmission } from "@/lib/creator-charts";
import { readVideoUrlField } from "@/lib/storage";
import { validateCtaLink } from "@/lib/cta-link";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { AudioRightsSchema } from "@/lib/validation";

const MAX_DESCRIPTION_LENGTH = 300;

export type PostCreatorVideoFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

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
    return { errors: { _form: ["Du musst zuerst eine Marke erstellen."] } };
  }

  const targetBrandId = formData.get("targetBrandId");
  if (typeof targetBrandId !== "string" || !targetBrandId) {
    return { errors: { _form: ["Bitte wähle die Marke aus, für die das Video ist."] } };
  }

  const video = readVideoUrlField(formData, "creator-videos");
  if ("error" in video) {
    return { errors: { video: [video.error] } };
  }

  // Phase 41: same required fields as a Solo-Pitch — Luca: "sollte 1:1
  // aussehen wie ein Solo-Pitch", especially since this is often literally
  // the same video already posted elsewhere with its own caption/link.
  const rawDescription = formData.get("description");
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (!description) {
    return { errors: { description: ["Bitte eine kurze Beschreibung schreiben."] } };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { errors: { description: [`Maximal ${MAX_DESCRIPTION_LENGTH} Zeichen.`] } };
  }

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { errors: cta.errors };
  }

  const audioRights = AudioRightsSchema.safeParse({ audioRightsConfirmed: formData.get("audioRightsConfirmed") });
  if (!audioRights.success) {
    return { errors: audioRights.error.flatten().fieldErrors };
  }

  const { allowed } = await checkRateLimit("creator-submit", myBrand.id);
  if (!allowed) {
    return { errors: { _form: [RATE_LIMIT_MESSAGE] } };
  }

  const containsAiContent = formData.get("containsAiContent") === "on";
  const result = await postCreatorSubmission(
    myBrand.id,
    targetBrandId,
    video.videoUrl,
    description,
    cta.ctaLabel,
    cta.ctaUrl,
    containsAiContent,
  );
  if (result.error) return { errors: { _form: [result.error] } };

  refresh();
  return { success: true };
}
