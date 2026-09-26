// Phase 44: Luca — "bau eine Kategorie Auswahl für Duelle, auch sowas wie
// mache einen One Take, und noch viele andere Ideen." Two misses before
// this landed: attempt 1 mixed in marketing tactics ("zeig eine
// Kundenreaktion") instead of production style; attempt 2 was camera-
// technique jargon (POV, Gimbal, Split-Screen) — "falsche Ebene" and "zu
// kompliziert umzusetzen" for a small brand with just a phone. What Luca
// actually wants, his own examples: "mache einen 1-Minuten-Pitch", "im
// Stil eines Kinofilms", "als Comic" — a creative genre/format prompt
// anyone can interpret with no special gear, not a technical constraint.
// Still a starter list, not a final one — add/remove/reword entries
// freely, nothing else needs to change (challenge.ts validates against
// this array, and every display spot just prints whatever string ended up
// stored per-row).
export const DUEL_CATEGORIES = [
  "Verkaufe dein Produkt oder deine Leistung in 15 Sekunden",
  "One Take — kein Schnitt, eine durchgehende Einstellung",
  "Mache einen 1-Minuten-Pitch",
  "Im Stil eines Kinofilms",
  "Im Comic-Stil",
  "Wie eine 90er-Werbung",
  "Wie ein Musikvideo",
  "Wie eine Nachrichtensendung",
] as const;

export type DuelCategory = (typeof DUEL_CATEGORIES)[number];

export const DEFAULT_DUEL_CATEGORY: DuelCategory = DUEL_CATEGORIES[0];

// How long a 'scheduled' battle's two brands have to each upload their
// video, counted from challenge acceptance (not from when the challenge was
// first sent — see CHALLENGE_WINDOW_MS in src/lib/challenge.ts, a separate
// clock for "should we even do this"). 2 weeks — enough time for an actual
// production, not just a phone clip.
export const PRODUCTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// How long voting stays open once BOTH videos are in — for 'open' battles
// that's immediately at creation; for 'scheduled' battles, whenever the
// second side uploads. 1 week: long enough for word-of-mouth on a young
// platform, short enough to stay a "this week's battle" event.
export const VOTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
