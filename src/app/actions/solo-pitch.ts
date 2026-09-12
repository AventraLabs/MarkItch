"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { uploadVideo, ALLOWED_VIDEO_TYPES } from "@/lib/storage";
import { PITCH_CATEGORY } from "@/lib/battle-format";

export type SoloPitchFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Phase 13: post a new solo pitch — a normal, opponent-free feed post. This
 * is the entry point that solves the "a video needs an already-arranged
 * Duell to exist at all" problem (see CLAUDE-CODE-UEBERGABE.md §6): every
 * video starts here, a Duell is something that can happen to it later
 * (challenge or promoted reaction), never a precondition for posting.
 */
export async function postSoloPitch(_prevState: SoloPitchFormState, formData: FormData): Promise<SoloPitchFormState> {
  const user = await requireUser();
  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { errors: { _form: ["Du musst zuerst eine Marke erstellen."] } };
  }

  const file = formData.get("video");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { video: ["Bitte ein Video auswählen."] } };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { errors: { video: ["Video darf maximal 50 MB groß sein."] } };
  }
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { errors: { video: ["Erlaubt: MP4, WEBM oder MOV."] } };
  }

  const uploaded = await uploadVideo(file, "solo-pitch-videos");

  await db.insert(soloPitches).values({
    brandId: myBrand.id,
    videoUrl: uploaded.url,
    category: PITCH_CATEGORY,
  });

  refresh();
  return { success: true };
}
