"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { brands, brandMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { readVideoUrlField } from "@/lib/storage";

export type VideoFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

/**
 * Phase 29: the video itself was already uploaded client-side directly to
 * storage by the time this runs (see video-picker-input.tsx) — this only
 * ever receives the resulting URL, never the file.
 */
export async function uploadBrandVideo(_prevState: VideoFormState, formData: FormData): Promise<VideoFormState> {
  const user = await requireUser();

  const [membership] = await db
    .select({ brandId: brandMembers.brandId })
    .from(brandMembers)
    .where(eq(brandMembers.userId, user.id))
    .limit(1);
  if (!membership) {
    return { errors: { _form: ["Du musst zuerst eine Marke erstellen."] } };
  }

  const video = readVideoUrlField(formData, "videos");
  if ("error" in video) {
    return { errors: { video: [video.error] } };
  }

  await db
    .update(brands)
    .set({ videoUrl: video.videoUrl, videoUploadedAt: new Date(), updatedAt: new Date() })
    .where(eq(brands.id, membership.brandId));

  // Next.js 16 no longer refreshes the invoking route automatically after a
  // Server Action — without this, the newly uploaded video wouldn't show up
  // on /profile until a manual reload (its own page fetch is unaffected;
  // this is only about *this* route's already-rendered server tree).
  refresh();

  return { success: true };
}
