import "server-only";
import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { comments, users } from "@/db/schema";

export type CommentWithAuthor = {
  id: string;
  content: string;
  createdAt: Date;
  authorName: string;
};

/** Newest first — a live feed under the Pitch, not a slow-to-load thread. */
export async function getCommentsForBattle(battleId: string): Promise<CommentWithAuthor[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.battleId, battleId))
    .orderBy(desc(comments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    // Most accounts have no display name set yet — the email's local part
    // reads better than "—" under a comment.
    authorName: row.name || row.email.split("@")[0],
  }));
}

/** Comment counts for a batch of battles — one query for a whole feed page. */
export async function getCommentCounts(battleIds: string[]): Promise<Map<string, number>> {
  if (battleIds.length === 0) return new Map();
  const rows = await db
    .select({ battleId: comments.battleId, n: count() })
    .from(comments)
    .where(inArray(comments.battleId, battleIds))
    .groupBy(comments.battleId);
  return new Map(rows.map((row) => [row.battleId as string, row.n]));
}

/** Phase 13: same as getCommentsForBattle, keyed on a solo pitch instead. */
export async function getCommentsForSoloPitch(soloPitchId: string): Promise<CommentWithAuthor[]> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.soloPitchId, soloPitchId))
    .orderBy(desc(comments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    authorName: row.name || row.email.split("@")[0],
  }));
}

export async function getCommentCountsForSoloPitches(soloPitchIds: string[]): Promise<Map<string, number>> {
  if (soloPitchIds.length === 0) return new Map();
  const rows = await db
    .select({ soloPitchId: comments.soloPitchId, n: count() })
    .from(comments)
    .where(inArray(comments.soloPitchId, soloPitchIds))
    .groupBy(comments.soloPitchId);
  return new Map(rows.map((row) => [row.soloPitchId as string, row.n]));
}
