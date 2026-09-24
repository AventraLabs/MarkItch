"use client";

/** Fire-and-forget view/share tracking — never blocks or throws into the caller. */
export function trackAnalyticsEvent(
  brandId: string,
  kind: "view" | "share",
  target?: { soloPitchId?: string; battleId?: string },
) {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandId, kind, ...target }),
  }).catch(() => {});
}
