import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

// Phase 15: Entwurf einer DSGVO-orientierten Datenschutzerklärung, abgeleitet
// aus dem tatsächlichen Datenmodell (src/db/schema.ts) und den tatsächlich
// eingesetzten Diensten — kein generischer Textbaustein. Das hier ist ein
// Entwurf, kein Rechtsrat — vor dem Onboarding echter Marken/Nutzer von
// einem Anwalt gegenprüfen lassen, gerade wegen der Video-Uploads und
// Push-Benachrichtigungen.
export default function DatenschutzPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Datenschutzerklärung</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: {new Date().toLocaleDateString("de-DE")}</p>

      <Section title="Verantwortlicher">
        <p>
          Austrana Solutions KG, Edi-Finger-Straße 7/6/602, 1210 Wien — siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          . Kontakt für Datenschutzanliegen: markitch@outlook.de
        </p>
      </Section>

      <Section title="Welche Daten wir verarbeiten">
        <p>
          <strong className="text-white">Account:</strong> E-Mail-Adresse, Passwort (nur als Hash gespeichert, nie
          im Klartext), optionaler Anzeigename, Rolle (Acro/Assent).
        </p>
        <p>
          <strong className="text-white">Inhalte:</strong> von dir hochgeladene Videos, Kommentare, Likes, Stimmen
          bei Duellen, Reaktionen auf Pitches, wem du folgst.
        </p>
        <p>
          <strong className="text-white">Technisch notwendig:</strong> IP-Adresse (kurzzeitig, ausschließlich zur
          Missbrauchs-/Manipulationserkennung bei Registrierung und Voting — siehe Abschnitt
          &quot;Sicherheit&quot;), Push-Benachrichtigungs-Zugangsdaten deines Browsers, sofern du
          Benachrichtigungen aktivierst.
        </p>
      </Section>

      <Section title="Wofür wir sie verwenden">
        <p>Um dir einen Account zu geben, deine Inhalte zu zeigen, Duelle/Abstimmungen zu ermöglichen und dich per Push zu benachrichtigen, wenn ein Ergebnis feststeht oder ein Pitch live geht. Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für die Kernfunktion, berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) für Missbrauchsschutz.</p>
      </Section>

      <Section title="Wer außer uns Zugriff hat (Auftragsverarbeiter)">
        <p>
          <strong className="text-white">Vercel</strong> — Hosting der Anwendung.
        </p>
        <p>
          <strong className="text-white">Supabase</strong> — Datenbank und Speicherung hochgeladener Videos/Bilder.
        </p>
        <p>
          <strong className="text-white">Push-Dienste deines Browsers</strong> (z. B. FCM/Mozilla Push/APNs, je nach
          Browser/Gerät) — technisch notwendig, um Benachrichtigungen zuzustellen, sobald du sie aktivierst.
        </p>
        <p>Mit allen Auftragsverarbeitern besteht bzw. wird ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO geschlossen.</p>
      </Section>

      <Section title="Speicherdauer">
        <p>
          Account- und Inhaltsdaten bleiben gespeichert, bis du dein Konto löschst. IP-Adressen zur
          Missbrauchserkennung werden nur für das jeweilige Zeitfenster (aktuell bis zu 24 Stunden) vorgehalten.
        </p>
      </Section>

      <Section title="Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer Aufsichtsbehörde zu beschweren (in
          Österreich: die Datenschutzbehörde, dsb.gv.at). Wende dich dafür an markitch@outlook.de.
        </p>
      </Section>

      <Section title="Sicherheit">
        <p>
          Passwörter werden gehasht gespeichert, nie im Klartext. IP-basierte Ratenbegrenzung schützt vor
          automatisiertem Missbrauch (Fake-Accounts, manipuliertes Voting).
        </p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Impressum
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
