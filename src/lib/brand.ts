import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, brandMembers } from "@/db/schema";

/** The single brand a user owns/belongs to (Phase 2: at most one). */
export async function getBrandForUser(userId: string) {
  const [row] = await db
    .select({ brand: brands })
    .from(brandMembers)
    .innerJoin(brands, eq(brandMembers.brandId, brands.id))
    .where(eq(brandMembers.userId, userId))
    .limit(1);
  return row?.brand ?? null;
}

/** Every user belonging to a brand (almost always exactly one) — who to notify about that brand's content. */
export async function getBrandMemberUserIds(brandId: string): Promise<string[]> {
  const rows = await db.select({ userId: brandMembers.userId }).from(brandMembers).where(eq(brandMembers.brandId, brandId));
  return rows.map((r) => r.userId);
}
