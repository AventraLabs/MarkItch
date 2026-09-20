"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { readVideoUrlField } from "@/lib/storage";
import { PITCH_CATEGORY } from "@/lib/battle-format";
import { validateCtaLink } from "@/lib/cta-link";

export type SoloPitchFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

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

  const cta = validateCtaLink(formData);
  if ("errors" in cta) {
    return { errors: cta.errors };
  }

  await db.insert(soloPitches).values({
    brandId: myBrand.id,
    videoUrl: video.videoUrl,
    category: PITCH_CATEGORY,
    ctaLabel: cta.ctaLabel,
    ctaUrl: cta.ctaUrl,
  });

  refresh();
  return { success: true };
}
