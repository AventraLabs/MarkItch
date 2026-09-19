import { Field } from "@/components/ui";

// Phase 27: shared by every fresh video upload (Solo-Pitch, Duell-Video,
// Kontern) — a video without a "wohin jetzt" ist für den Zuschauer eine
// Sackgasse. Required going forward, but the DB columns stay nullable so
// existing content never needs a backfill (see schema.ts).
export function CtaLinkFields({ errors }: { errors?: Record<string, string[]> }) {
  return (
    <div className="mb-3 rounded-lg border border-zinc-800 p-3">
      <p className="mb-2 text-xs text-zinc-500">
        Wohin soll ein interessierter Zuschauer geleitet werden? Shop, Speisekarte, Standort/Route,
        Rabattcode-Landingpage — was auch immer zu diesem Video passt.
      </p>
      <Field label="Beschriftung (z. B. „Jetzt bestellen“, „Route“)" name="ctaLabel" errors={errors?.ctaLabel} />
      <Field label="Link" name="ctaUrl" type="url" errors={errors?.ctaUrl} />
    </div>
  );
}
