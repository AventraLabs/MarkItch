"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { battles, comments } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getActorLabel, notifyUsers } from "@/lib/notification";
import { getBrandMemberUserIds } from "@/lib/brand";

export type CommentFormState = { error?: string } | undefined;

const MAX_COMMENT_LENGTH = 500;

/** Anyone signed in can comment — Acro or Assent, including a Pitch's own brands. */
export async function postComment(_prevState: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const user = await requireUser();
  const battleId = formData.get("battleId");
  const content = formData.get("content");

  if (typeof battleId !== "string" || !battleId) {
    return { error: "Ungültige Anfrage." };
  }
  if (typeof content !== "string" || !content.trim()) {
    return { error: "Kommentar darf nicht leer sein." };
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return { error: `Kommentar darf maximal ${MAX_COMMENT_LENGTH} Zeichen lang sein.` };
  }

  const [battle] = await db
    .select({ id: battles.id, brandAId: battles.brandAId, brandBId: battles.brandBId })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);
  if (!battle) {
    return { error: "Dieser Pitch existiert nicht." };
  }

  await db.insert(comments).values({ battleId, userId: user.id, content: content.trim() });
  const [memberIdsA, memberIdsB, actor] = await Promise.all([
    getBrandMemberUserIds(battle.brandAId),
    getBrandMemberUserIds(battle.brandBId),
    getActorLabel(user.id),
  ]);
  await notifyUsers([...memberIdsA, ...memberIdsB], `${actor.label} hat dein Duell kommentiert.`, `/?battle=${battleId}`, user.id);

  refresh();
  return undefined;
}
