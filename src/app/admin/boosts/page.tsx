import Link from "next/link";
import { requireAdminUser } from "@/lib/moderation";
import { getActiveBoosts, getPendingBoosts } from "@/lib/boost";
import { activateBoostAction, rejectBoostAction } from "@/app/actions/boost";

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Phase 26: Boost hat noch keinen Zahlungsanbieter — eine Anfrage landet
 * hier als 'pending', Luca bestätigt die Zahlung außerhalb der App (Konto/
 * Rechnung) und aktiviert dann hier per Klick.
 */
export default async function BoostsAdminPage() {
  await requireAdminUser();
  const [pending, active] = await Promise.all([getPendingBoosts(), getActiveBoosts()]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Boosts</h1>
        <Link href="/admin/moderation" className="text-sm text-zinc-500 hover:text-zinc-300">
          Moderation →
        </Link>
        <Link href="/admin/analytics" className="text-sm text-zinc-500 hover:text-zinc-300">
          Analytics →
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Offene Anfragen {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">Keine offenen Boost-Anfragen.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((b) => (
              <li key={b.id} className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <a href={`/brands/${b.brandSlug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white hover:underline">
                    {b.brandName} ↗
                  </a>
                  <span className="text-sm text-orange-400">{formatPrice(b.priceCents)}</span>
                </div>
                <p className="mb-3 text-xs text-zinc-500">Angefragt {b.requestedAt.toLocaleString("de-AT")}</p>
                <div className="flex gap-2">
                  <form action={activateBoostAction}>
                    <input type="hidden" name="boostId" value={b.id} />
                    <button className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-500">
                      Zahlung bestätigt — Boost aktivieren
                    </button>
                  </form>
                  <form action={rejectBoostAction}>
                    <input type="hidden" name="boostId" value={b.id} />
                    <button className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">
                      Ablehnen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Aktive Boosts {active.length > 0 && `(${active.length})`}
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">Gerade läuft kein Boost.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-xl border border-zinc-800 p-3">
                <a href={`/brands/${b.brandSlug}`} target="_blank" rel="noreferrer" className="text-sm text-white hover:underline">
                  {b.brandName}
                </a>
                <span className="text-xs text-zinc-500">Läuft bis {b.expiresAt.toLocaleString("de-AT")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
