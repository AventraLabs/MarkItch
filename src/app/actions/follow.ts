"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { follows } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { isFollowing } from "@/lib/follow";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

export type FollowFormState = { error?: string } | undefined;

/** Toggle follow/unfollow for the current user on one brand. */
export async function toggleFollow(_prevState: FollowFormState, formData: FormData): Promise<FollowFormState> {
  const user = await requireUser();
  const brandId = formData.get("brandId");
  if (typeof brandId !== "string" || !brandId) {
    return { error: "Ungültige Anfrage." };
  }

  const alreadyFollowing = await isFollowing(user.id, brandId);
  if (alreadyFollowing) {
    await db.delete(follows).where(and(eq(follows.userId, user.id), eq(follows.brandId, brandId)));
  } else {
    // onConflictDoNothing: a double-click racing two requests shouldn't 500.
    await db.insert(follows).values({ userId: user.id, brandId }).onConflictDoNothing();

    // Phase 35: tell the brand's owner(s) — never on unfollow, only the
    // positive action, same as Insta.
    const [memberIds, actor] = await Promise.all([getBrandMemberUserIds(brandId), getActorLabel(user.id)]);
    await notifyUsers(memberIds, `${actor.label} folgt dir jetzt.`, actor.link, user.id);
  }

  refresh();
  return undefined;
}
