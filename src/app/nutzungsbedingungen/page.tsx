import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

// Phase 15: Entwurf, kein Rechtsrat — insbesondere der Rechte-Abschnitt zu
// hochgeladenen Videos und der Gerichtsstand sollten vor echtem Live-Betrieb
// anwaltlich geprüft werden. [BETREIBER]/Gerichtsstand sind Platzhalter.
export default function NutzungsbedingungenPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Nutzungsbedingungen</h1>
      <p className="mb-6 text-xs text-zinc-600">Stand: {new Date().toLocaleDateString("de-DE")}</p>

      <Section title="Geltungsbereich">
        <p>
          Diese Nutzungsbedingungen gelten für alle registrierten Nutzer:innen von Market Matcher, betrieben von
          [BETREIBER] (siehe{" "}
          <Link href="/impressum" className="text-orange-400 hover:underline">
            Impressum
          </Link>
          ). Mit der Registrierung akzeptierst du sie.
        </p>
      </Section>

      <Section title="Dein Account">
        <p>
          Du bist für die Richtigkeit deiner Angaben und die Sicherheit deines Passworts selbst verantwortlich.
          Ein Account pro Person bzw. pro Marke. Als &quot;Acro&quot; (Marke) darfst du nur eine Marke vertreten, die du
          tatsächlich repräsentierst.
        </p>
      </Section>

      <Section title="Deine Inhalte (Videos, Kommentare)">
        <p>
          Du behältst die Rechte an deinen hochgeladenen Videos. Mit dem Hochladen räumst du uns das Recht ein, das
          Video auf der Plattform zu zeigen, zu speichern und (bei Duellen/Reaktionen) im Kontext anderer Videos
          darzustellen. Du darfst nur Inhalte hochladen, an denen du die nötigen Rechte hast — keine fremden
          Marken, Musik oder Aufnahmen ohne Erlaubnis.
        </p>
      </Section>

      <Section title="Fairness beim Voting">
        <p>
          Manipulation ist verboten: Fake-Accounts, automatisiertes/gekauftes Voting, koordinierte Stimmabgabe
          außerhalb normaler Nutzung. Wir setzen technische Maßnahmen (Ratenbegrenzung) dagegen ein und behalten
          uns vor, verdächtige Stimmen zu entfernen und Accounts zu sperren.
        </p>
      </Section>

      <Section title="Duelle und Ergebnisse">
        <p>
          Duelle und Abstimmungen dienen der Unterhaltung. Ein Sieg bringt keinen automatischen Anspruch auf Geld,
          Preise oder eine Zusammenarbeit — sofern eine Marke das für einen konkreten Fall nicht ausdrücklich
          anders zusagt.
        </p>
      </Section>

      <Section title="Sperrung und Kündigung">
        <p>
          Wir können Accounts bei Verstößen gegen diese Bedingungen sperren oder löschen. Du kannst dein Konto
          jederzeit über die Kontaktadresse im Impressum löschen lassen.
        </p>
      </Section>

      <Section title="Haftung">
        <p>
          Die Plattform wird ohne Gewähr für ständige Verfügbarkeit bereitgestellt. Für Inhalte, die Nutzer:innen
          hochladen, haften wir nicht als eigene Inhalte, sofern wir keine Kenntnis von deren Rechtswidrigkeit
          haben.
        </p>
      </Section>

      <Section title="Änderungen & Gerichtsstand">
        <p>
          Wir können diese Bedingungen ändern; wesentliche Änderungen kündigen wir an. Es gilt das Recht
          [LAND], Gerichtsstand ist [ORT], soweit gesetzlich zulässig.
        </p>
      </Section>

      <p className="mt-8 text-xs text-zinc-600">
        Siehe auch{" "}
        <Link href="/impressum" className="text-orange-400 hover:underline">
          Impressum
        </Link>{" "}
        und{" "}
        <Link href="/datenschutz" className="text-orange-400 hover:underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </div>
  );
}
