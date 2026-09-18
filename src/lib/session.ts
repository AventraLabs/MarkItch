import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Phase 24: a ban has to cut an already-active session off immediately, not
 * just block the next login (auth.ts) — the JWT itself has no ban state
 * and isn't rechecked until it expires, so this is the only place that can
 * catch "banned mid-session". One extra query per call; this app has no
 * traffic where that matters yet.
 */
async function isBanned(userId: string): Promise<boolean> {
  const [row] = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.bannedAt != null;
}

/** Use in Server Components / Actions that require a logged-in user. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (await isBanned(session.user.id)) {
    redirect("/gesperrt");
  }
  return session.user;
}

/** Use where a session is optional (e.g. the home page). */
export async function getOptionalUser() {
  const session = await auth();
  if (!session?.user) return null;
  if (await isBanned(session.user.id)) return null;
  return session.user;
}
