import "server-only";
import { and, eq, gte, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { brandAnalyticsEvents, visitorEvents, battles, brands, soloPitches, users, votes } from "@/db/schema";

// Phase 47: interne Metriken für /admin/analytics — deckt BETA-2-F/G aus
// MarkItch_Launch_Minimum_Claude_Code_Prompt.md ab ("Produkt-/Funnel-
// Analytics", "Vote-Funnel"). Bewusst alles in JS aggregiert statt mit
// SQL-Datums-Funktionen — bei Beta-Datenmengen (niedrige Tausenderstellen)
// unproblematisch, und deutlich einfacher lesbar/wartbar als
// dialektspezifisches SQL. "Kein überdimensioniertes Data-Warehouse" (siehe
// Launch-Plan §3.F) — wenn das Datenvolumen das mal sprengt, ist das ein
// gutes Problem.

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type VisitorStats = {
  uniqueVisitors: number;
  sessionStarts: number;
  dailyUniqueVisitors: { day: string; count: number }[];
};

/** "Sessions/Besucher" — eindeutige anonId mit mindestens einem session_start im Zeitraum. */
export async function getVisitorStats(days = 30): Promise<VisitorStats> {
  const rows = await db
    .select({ anonId: visitorEvents.anonId, createdAt: visitorEvents.createdAt })
    .from(visitorEvents)
    .where(and(eq(visitorEvents.kind, "session_start"), gte(visitorEvents.createdAt, daysAgo(days))));

  const byDay = new Map<string, Set<string>>();
  const allVisitors = new Set<string>();
  for (const r of rows) {
    allVisitors.add(r.anonId);
    const key = dayKey(r.createdAt);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(r.anonId);
  }

  const dailyUniqueVisitors = [...byDay.entries()]
    .map(([day, set]) => ({ day, count: set.size }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  return { uniqueVisitors: allVisitors.size, sessionStarts: rows.length, dailyUniqueVisitors };
}

export type VideosPerSessionStats = {
  sessionsWithViews: number;
  avgVideosPerSession: number;
  pctReaching3: number;
  pctReaching5: number;
  pctReaching10: number;
};

/** "Videos pro Session" / "3/5/10 Videos angesehen" — (anonId, Kalendertag) als Session-Näherung, siehe SessionBoot. */
export async function getVideosPerSessionStats(days = 14): Promise<VideosPerSessionStats> {
  const rows = await db
    .select({ anonId: brandAnalyticsEvents.anonId, createdAt: brandAnalyticsEvents.createdAt })
    .from(brandAnalyticsEvents)
    .where(
      and(eq(brandAnalyticsEvents.kind, "view"), isNotNull(brandAnalyticsEvents.anonId), gte(brandAnalyticsEvents.createdAt, daysAgo(days))),
    );

  const perSession = new Map<string, number>();
  for (const r of rows) {
    if (!r.anonId) continue;
    const key = `${r.anonId}:${dayKey(r.createdAt)}`;
    perSession.set(key, (perSession.get(key) ?? 0) + 1);
  }

  const counts = [...perSession.values()];
  const sessionsWithViews = counts.length;
  if (sessionsWithViews === 0) {
    return { sessionsWithViews: 0, avgVideosPerSession: 0, pctReaching3: 0, pctReaching5: 0, pctReaching10: 0 };
  }
  const total = counts.reduce((sum, n) => sum + n, 0);
  const pct = (threshold: number) => (counts.filter((n) => n >= threshold).length / sessionsWithViews) * 100;

  return {
    sessionsWithViews,
    avgVideosPerSession: total / sessionsWithViews,
    pctReaching3: pct(3),
    pctReaching5: pct(5),
    pctReaching10: pct(10),
  };
}

export type RetentionStats = {
  /** Null, solange nicht genug Tage/Aktivität vorliegen, um die Kennzahl sinnvoll zu bilden. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
  activeDaysObserved: number;
};

/**
 * D1/D7/D30-Retention als "rolling retention": von allen anonId, die vor N
 * Tagen aktiv waren, wie viel Prozent waren auch am Beobachtungstag selbst
 * aktiv — gemittelt über die Tage im Fenster. "Aktiv" = session_start ODER
 * ein getaggter view (siehe getVideosPerSessionStats). Bewusst kein
 * vollständiges Kohorten-Modell — für eine frühe Beta reicht dieser
 * einfachere, robuste Näherungswert (siehe Datei-Kommentar oben).
 */
export async function getRetention(): Promise<RetentionStats> {
  const since = daysAgo(45);
  const [sessionRows, viewRows] = await Promise.all([
    db
      .select({ anonId: visitorEvents.anonId, createdAt: visitorEvents.createdAt })
      .from(visitorEvents)
      .where(and(eq(visitorEvents.kind, "session_start"), gte(visitorEvents.createdAt, since))),
    db
      .select({ anonId: brandAnalyticsEvents.anonId, createdAt: brandAnalyticsEvents.createdAt })
      .from(brandAnalyticsEvents)
      .where(and(eq(brandAnalyticsEvents.kind, "view"), isNotNull(brandAnalyticsEvents.anonId), gte(brandAnalyticsEvents.createdAt, since))),
  ]);

  const activeByDay = new Map<string, Set<string>>();
  const addActive = (anonId: string | null, createdAt: Date) => {
    if (!anonId) return;
    const key = dayKey(createdAt);
    if (!activeByDay.has(key)) activeByDay.set(key, new Set());
    activeByDay.get(key)!.add(anonId);
  };
  for (const r of sessionRows) addActive(r.anonId, r.createdAt);
  for (const r of viewRows) addActive(r.anonId, r.createdAt);

  const days = [...activeByDay.keys()].sort();

  function rollingRetention(offset: number): number | null {
    let retained = 0;
    let baseline = 0;
    for (const day of days) {
      const base = activeByDay.get(day);
      if (!base || base.size === 0) continue;
      const laterDate = new Date(`${day}T00:00:00.000Z`);
      laterDate.setUTCDate(laterDate.getUTCDate() + offset);
      const later = activeByDay.get(dayKey(laterDate));
      if (!later) continue; // dieser Vergleichstag liegt (noch) außerhalb der beobachteten Daten
      baseline += base.size;
      for (const anonId of base) if (later.has(anonId)) retained += 1;
    }
    return baseline > 0 ? (retained / baseline) * 100 : null;
  }

  return { d1: rollingRetention(1), d7: rollingRetention(7), d30: rollingRetention(30), activeDaysObserved: days.length };
}

export type CtaStats = { views: number; clicks: number; ctr: number | null };

/** "CTA Clicks und CTA CTR". */
export async function getCtaStats(days = 30): Promise<CtaStats> {
  const rows = await db
    .select({ kind: brandAnalyticsEvents.kind })
    .from(brandAnalyticsEvents)
    .where(gte(brandAnalyticsEvents.createdAt, daysAgo(days)));
  const views = rows.filter((r) => r.kind === "view").length;
  const clicks = rows.filter((r) => r.kind === "cta_click").length;
  return { views, clicks, ctr: views > 0 ? (clicks / views) * 100 : null };
}

export type VoteFunnelStats = {
  contentOpened: number;
  voteClicked: number;
  loginRequired: number;
  registerStarted: number;
  registerCompleted: number;
  voteCompleted: number;
};

/**
 * BETA-2-G: "Content/Battle geöffnet → Vote geklickt → Login erforderlich →
 * Registrierung begonnen → Registrierung abgeschlossen → Vote abgeschlossen".
 * Bewusst Rohzahlen pro Schritt im Zeitraum, kein Versuch, jede einzelne
 * Person durch alle Schritte hindurch zu verfolgen (das würde eine robuste
 * anonId↔userId-Verknüpfung über den Login-Moment hinweg brauchen, siehe
 * Kommentar zu visitorEvents in schema.ts) — für die Beta reicht der grobe
 * Trichter aus Stufen-Zählungen, um die größten Abbruchpunkte zu sehen.
 */
export async function getVoteFunnel(days = 30): Promise<VoteFunnelStats> {
  const since = daysAgo(days);
  const [battleEvents, registerStartedRows, registerCompletedRows, voteRows] = await Promise.all([
    db
      .select({ kind: brandAnalyticsEvents.kind })
      .from(brandAnalyticsEvents)
      .where(and(isNotNull(brandAnalyticsEvents.battleId), gte(brandAnalyticsEvents.createdAt, since))),
    db
      .select({ anonId: visitorEvents.anonId })
      .from(visitorEvents)
      .where(and(eq(visitorEvents.kind, "register_started"), gte(visitorEvents.createdAt, since))),
    db.select({ id: users.id }).from(users).where(gte(users.createdAt, since)),
    db.select({ id: votes.id }).from(votes).where(gte(votes.createdAt, since)),
  ]);

  return {
    contentOpened: battleEvents.filter((r) => r.kind === "view").length,
    voteClicked: battleEvents.filter((r) => r.kind === "vote_click").length,
    loginRequired: battleEvents.filter((r) => r.kind === "login_required").length,
    registerStarted: new Set(registerStartedRows.map((r) => r.anonId)).size,
    registerCompleted: registerCompletedRows.length,
    voteCompleted: voteRows.length,
  };
}

export type ReferralStats = { totalSessions: number; withRef: number; topRefs: { ref: string; count: number }[] };

/** "Herkunft über geteilte MarkItch-Links". */
export async function getReferralStats(days = 30): Promise<ReferralStats> {
  const rows = await db
    .select({ ref: visitorEvents.ref })
    .from(visitorEvents)
    .where(and(eq(visitorEvents.kind, "session_start"), gte(visitorEvents.createdAt, daysAgo(days))));

  const counts = new Map<string, number>();
  let withRef = 0;
  for (const r of rows) {
    if (!r.ref) continue;
    withRef += 1;
    counts.set(r.ref, (counts.get(r.ref) ?? 0) + 1);
  }
  const topRefs = [...counts.entries()]
    .map(([ref, count]) => ({ ref, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalSessions: rows.length, withRef, topRefs };
}

export type ActiveBrandsStats = { totalBrands: number; activeLast30d: number; postedMoreThanOnce: number };

/** "Aktive Marken" / "Marken, die erneut posten" — direkt aus den Content-Tabellen, keine eigenen Events nötig. */
export async function getActiveBrandsStats(): Promise<ActiveBrandsStats> {
  const cutoff = daysAgo(30);
  const [totalBrandsRow, soloRows, battleRows] = await Promise.all([
    db.select({ id: brands.id }).from(brands),
    db.select({ brandId: soloPitches.brandId, createdAt: soloPitches.createdAt }).from(soloPitches),
    db
      .select({
        brandAId: battles.brandAId,
        brandBId: battles.brandBId,
        brandASubmittedAt: battles.brandASubmittedAt,
        brandBSubmittedAt: battles.brandBSubmittedAt,
      })
      .from(battles)
      .where(or(isNotNull(battles.brandASubmittedAt), isNotNull(battles.brandBSubmittedAt))),
  ]);

  const postCountByBrand = new Map<string, number>();
  const lastPostedByBrand = new Map<string, Date>();
  const bump = (brandId: string, at: Date) => {
    postCountByBrand.set(brandId, (postCountByBrand.get(brandId) ?? 0) + 1);
    const prev = lastPostedByBrand.get(brandId);
    if (!prev || at > prev) lastPostedByBrand.set(brandId, at);
  };
  for (const r of soloRows) bump(r.brandId, r.createdAt);
  for (const r of battleRows) {
    if (r.brandASubmittedAt) bump(r.brandAId, r.brandASubmittedAt);
    if (r.brandBSubmittedAt) bump(r.brandBId, r.brandBSubmittedAt);
  }

  let activeLast30d = 0;
  let postedMoreThanOnce = 0;
  for (const [, count] of postCountByBrand) if (count > 1) postedMoreThanOnce += 1;
  for (const [, lastAt] of lastPostedByBrand) if (lastAt >= cutoff) activeLast30d += 1;

  return { totalBrands: totalBrandsRow.length, activeLast30d, postedMoreThanOnce };
}
