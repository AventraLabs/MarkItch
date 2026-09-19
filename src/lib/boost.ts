import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { boosts, brands, soloPitches } from "@/db/schema";

// Phase 26: Boost — the platform's first paid feature. A brand pays to give
// one of its own Solo-Pitches a temporary visibility bump in the "Für
// dich"-Feed (BOOST_MULTIPLIER in feed.ts). No payment processor wired up
// yet (see CLAUDE-CODE-UEBERGABE.md) — a request lands as 'pending' here,
// Luca confirms payment happened off-platform and activates it by hand via
// /admin/boosts. 'expired' is derived from expiresAt at read time, not
// stored — same "state from timestamps" philosophy as battle-stage.ts.
export const BOOST_PRICE_CENTS = 1900; // €19 — placeholder until real pricing is decided
export const BOOST_DURATION_MS = 48 * 60 * 60 * 1000; // 48h

export type BoostStatus = "pending" | "active" | "rejected" | "expired";

function deriveStatus(row: { status: string; expiresAt: Date | null }): BoostStatus {
  if (row.status === "active" && (!row.expiresAt || row.expiresAt.getTime() < Date.now())) return "expired";
  return row.status as BoostStatus;
}

export type BoostInfo = { id: string; status: BoostStatus; expiresAt: Date | null; priceCents: number };

/** A pitch only ever has one "current" boost — a new request is blocked while one is pending/active, see requestBoost. */
export async function getBoostForSoloPitch(soloPitchId: string): Promise<BoostInfo | null> {
  const [row] = await db
    .select()
    .from(boosts)
    .where(eq(boosts.soloPitchId, soloPitchId))
    .orderBy(desc(boosts.requestedAt))
    .limit(1);
  if (!row) return null;
  return { id: row.id, status: deriveStatus(row), expiresAt: row.expiresAt, priceCents: row.priceCents };
}

export async function requestBoost(brandId: string, soloPitchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [pitch] = await db.select({ brandId: soloPitches.brandId }).from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) return { ok: false, error: "Dieser Pitch existiert nicht." };
  if (pitch.brandId !== brandId) return { ok: false, error: "Das ist nicht dein Pitch." };

  const existing = await getBoostForSoloPitch(soloPitchId);
  if (existing && (existing.status === "pending" || existing.status === "active")) {
    return { ok: false, error: "Für diesen Pitch läuft schon eine Boost-Anfrage oder ein aktiver Boost." };
  }

  await db.insert(boosts).values({ brandId, soloPitchId, priceCents: BOOST_PRICE_CENTS });
  return { ok: true };
}

/** Which of these pitches currently have an active, not-yet-expired boost — feed.ts's ranking bonus. */
export async function getActiveBoostedSoloPitchIds(soloPitchIds: string[]): Promise<Set<string>> {
  if (soloPitchIds.length === 0) return new Set();
  const rows = await db
    .select({ soloPitchId: boosts.soloPitchId })
    .from(boosts)
    .where(and(inArray(boosts.soloPitchId, soloPitchIds), eq(boosts.status, "active"), gt(boosts.expiresAt, new Date())));
  return new Set(rows.map((r) => r.soloPitchId));
}

export type PendingBoost = {
  id: string;
  soloPitchId: string;
  brandName: string;
  brandSlug: string;
  priceCents: number;
  requestedAt: Date;
};

export async function getPendingBoosts(): Promise<PendingBoost[]> {
  return db
    .select({
      id: boosts.id,
      soloPitchId: boosts.soloPitchId,
      priceCents: boosts.priceCents,
      requestedAt: boosts.requestedAt,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(boosts)
    .innerJoin(brands, eq(boosts.brandId, brands.id))
    .where(eq(boosts.status, "pending"))
    .orderBy(desc(boosts.requestedAt));
}

export type ActiveBoost = { id: string; soloPitchId: string; brandName: string; brandSlug: string; expiresAt: Date };

export async function getActiveBoosts(): Promise<ActiveBoost[]> {
  const rows = await db
    .select({
      id: boosts.id,
      soloPitchId: boosts.soloPitchId,
      expiresAt: boosts.expiresAt,
      brandName: brands.name,
      brandSlug: brands.slug,
    })
    .from(boosts)
    .innerJoin(brands, eq(boosts.brandId, brands.id))
    .where(and(eq(boosts.status, "active"), gt(boosts.expiresAt, new Date())))
    .orderBy(desc(boosts.expiresAt));
  return rows.map((r) => ({ ...r, expiresAt: r.expiresAt! }));
}

export async function activateBoost(boostId: string): Promise<void> {
  const now = new Date();
  await db
    .update(boosts)
    .set({ status: "active", activatedAt: now, expiresAt: new Date(now.getTime() + BOOST_DURATION_MS) })
    .where(eq(boosts.id, boostId));
}

export async function rejectBoost(boostId: string): Promise<void> {
  await db.update(boosts).set({ status: "rejected" }).where(eq(boosts.id, boostId));
}
