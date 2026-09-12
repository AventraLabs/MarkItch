import Link from "next/link";

// Phase 15: Impressumspflicht (§ 5 TMG/DDG bzw. § 5 ECG) gilt für ein
// öffentlich erreichbares, geschäftsmäßiges Telemedienangebot mit
// Registrierung — trifft schon jetzt zu, nicht erst "sobald echte Firmen
// mitmachen". Die Betreiber-Angaben unten sind Platzhalter und MÜSSEN vor
// echtem Live-Betrieb durch die echten Daten ersetzt werden (siehe
// CLAUDE-CODE-UEBERGABE.md) — ein Impressum mit Platzhaltertext ist
// rechtlich riskanter als gar keines.
export default function ImpressumPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Impressum</h1>

      <div className="mb-6 rounded-xl border border-yellow-600/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        Diese Seite enthält noch Platzhalter — sie ersetzen erst die echten Angaben, wenn du sie ausfüllst.
      </div>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Angaben gemäß § 5 TMG / § 5 ECG</h2>
        <p>[NAME / FIRMENNAME]</p>
        <p>[STRASSE UND HAUSNUMMER]</p>
        <p>[PLZ UND ORT]</p>
        <p>[LAND]</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Kontakt</h2>
        <p>E-Mail: [KONTAKT-E-MAIL]</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
        </h2>
        <p>[NAME, wie oben]</p>
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>{" "}
        und{" "}
        <Link href="/nutzungsbedingungen" className="text-orange-400 hover:underline">
          Nutzungsbedingungen
        </Link>
        .
      </p>
    </div>
  );
}
