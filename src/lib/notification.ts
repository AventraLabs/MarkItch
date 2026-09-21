import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { brandMembers, brands, notifications, users, type Notification } from "@/db/schema";

const RECENT_LIMIT = 20;

/**
 * How to refer to whoever just followed/liked/commented, from the
 * recipient's point of view — their brand name + a link to it if they have
 * one (almost everyone who can act does), else just their account name/
 * email with no link. Used to keep every "X did Y" notification's wording
 * uniform regardless of what kind of account X is.
 */
export async function getActorLabel(userId: string): Promise<{ label: string; link: string | null }> {
  const [brandRow] = await db
    .select({ name: brands.name, slug: brands.slug })
    .from(brandMembers)
    .innerJoin(brands, eq(brandMembers.brandId, brands.id))
    .where(eq(brandMembers.userId, userId))
    .limit(1);
  if (brandRow) return { label: brandRow.name, link: `/brands/${brandRow.slug}` };

  const [userRow] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return { label: userRow?.name || userRow?.email || "Jemand", link: null };
}

/**
 * Phase 35: shared insert path for follow/like/comment notifications —
 * battle-live notifications (battle-stage.ts) still insert directly since
 * they predate `link` and already have their own battleId-based fallback.
 * Silently skips notifying `excludeUserId` (acting on your own content) and
 * de-dupes recipients, since a brand can have more than one member.
 */
export async function notifyUsers(
  userIds: string[],
  message: string,
  link: string | null,
  excludeUserId?: string,
): Promise<void> {
  const recipients = [...new Set(userIds)].filter((id) => id !== excludeUserId);
  if (recipients.length === 0) return;
  await db.insert(notifications).values(recipients.map((userId) => ({ userId, message, link })));
}

/** Most recent notifications for this user, newest first. */
export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(RECENT_LIMIT);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}
