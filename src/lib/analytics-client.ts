"use client";

const ANON_ID_COOKIE = "mi_vid";
const ANON_ID_MAX_AGE_DAYS = 400; // Safaris eigene Obergrenze für client-gesetzte Cookies

/**
 * Phase 47: anonymes, zufälliges Besucher-Kennzeichen (kein Personenbezug —
 * kein Name/E-Mail/Login nötig) für Sessions/Besucher-Zählung, "Videos pro
 * Session" und D1/D7/D30-Retention (siehe visitorEvents in schema.ts). Bleibt
 * über Logins hinweg dasselbe Cookie, wird aber nie mit einer Identität
 * verknüpft, nur optional mit userId, wenn zum Zeitpunkt des Events
 * eingeloggt war (serverseitig in /api/analytics/visit ergänzt).
 */
export function getOrCreateAnonId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${ANON_ID_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const id = crypto.randomUUID();
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${ANON_ID_COOKIE}=${id}; path=/; max-age=${ANON_ID_MAX_AGE_DAYS * 86400}; samesite=lax${secure}`;
  return id;
}

/** Fire-and-forget content-event tracking — never blocks or throws into the caller. */
export function trackAnalyticsEvent(
  brandId: string,
  kind: "view" | "share" | "cta_click" | "vote_click" | "login_required",
  target?: { soloPitchId?: string; battleId?: string },
) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandId, kind, anonId: getOrCreateAnonId(), ...target }),
  }).catch(() => {});
}

/** Fire-and-forget visitor-/account-level event tracking (session start, registration funnel). */
export function trackVisitorEvent(kind: "session_start" | "register_started", ref?: string | null) {
  fetch("/api/analytics/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId: getOrCreateAnonId(), kind, ref }),
  }).catch(() => {});
}
