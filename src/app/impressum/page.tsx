import Link from "next/link";

// Phase 15: Impressumspflicht (§ 5 ECG) gilt für ein öffentlich erreichbares,
// geschäftsmäßiges Telemedienangebot mit Registrierung — trifft schon jetzt
// zu, nicht erst "sobald echte Firmen mitmachen". Firmenbuchnummer/
// Firmenbuchgericht/UID-Nummer fehlen noch — als KG ist Austrana Solutions
// im Firmenbuch eingetragen, diese Angaben gehören für volle ECG-Konformität
// noch dazu (siehe CLAUDE-CODE-UEBERGABE.md).
export default function ImpressumPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Impressum</h1>

      <div className="mb-6 rounded-xl border border-yellow-600/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        Firmenbuchnummer, Firmenbuchgericht und UID-Nummer fehlen hier noch — für ein vollständiges Impressum einer
        KG nötig.
      </div>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Angaben gemäß § 5 ECG</h2>
        <p>Austrana Solutions KG</p>
        <p>Edi-Finger-Straße 7/6/602</p>
        <p>1210 Wien</p>
        <p>Österreich</p>
        <p className="text-zinc-500">Firmenbuchnummer: [FN …]</p>
        <p className="text-zinc-500">Firmenbuchgericht: [Handelsgericht Wien o. Ä.]</p>
        <p className="text-zinc-500">UID-Nummer: [ATU …]</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Kontakt</h2>
        <p>E-Mail: markitch@outlook.de</p>
      </section>

      <section className="mb-6 space-y-1 text-sm text-zinc-300">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Verantwortlich für den Inhalt
        </h2>
        <p>Austrana Solutions KG, wie oben</p>
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
