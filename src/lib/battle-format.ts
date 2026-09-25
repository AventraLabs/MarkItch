// Phase 44: Luca — "bau eine Kategorie Auswahl für Duelle, auch sowas wie
// mache einen One Take, und noch viele andere Ideen." First attempt missed
// the point (Luca: "keine einzige von deinen finde ich gut") — these are
// supposed to be constraints on *how the ad itself is made/looks*, like
// "One Take", not marketing tactics like "zeig eine Kundenreaktion". This
// list only has that one kind of entry now. Still a starter list, not a
// final one — add/remove/reword entries freely, nothing else needs to
// change (challenge.ts validates against this array, and every display
// spot just prints whatever string ended up stored per-row).
export const DUEL_CATEGORIES = [
  "Verkaufe dein Produkt oder deine Leistung in 15 Sekunden",
  "One Take — kein Schnitt, eine durchgehende Einstellung",
  "Nur Handkamera — kein Stativ, kein Gimbal",
  "Ohne Worte — nur Bild & Musik",
  "POV — aus der Ich-Perspektive gefilmt",
  "Split-Screen — zwei Bilder gleichzeitig",
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
