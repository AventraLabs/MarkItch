"use client";

import { useState } from "react";
import { Rocket, X } from "lucide-react";
import type { BoostStatus } from "@/lib/boost";

type StatusResponse = {
  boost: { status: BoostStatus; expiresAt: string | null } | null;
  priceCents: number;
  durationHours: number;
};

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

// Phase 26: only ever shown on a brand's own Solo-Pitch (viewerOwnsThisBrand
// in feed-solo-pitch-card.tsx) — this is where a brand pays to give that
// pitch a temporary ranking bump in the "Für dich"-Feed. No payment
// processor yet: a request goes to Luca, who confirms payment happened
// off-platform and activates it via /admin/boosts (see that page's comment).
export function BoostButton({ soloPitchId }: { soloPitchId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  async function openSheet() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/boost?soloPitchId=${soloPitchId}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error ?? "Konnte Boost-Status nicht laden.");
    } catch {
      setError("Konnte Boost-Status nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloPitchId }),
      });
      const json = await res.json();
      if (res.ok) setRequested(true);
      else setError(json.error ?? "Anfrage fehlgeschlagen.");
    } catch {
      setError("Anfrage fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openSheet}
        className="inline-flex items-center gap-1 rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20"
      >
        <Rocket size={13} /> Boosten
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Pitch boosten</h2>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {loading && !data ? (
              <p className="text-sm text-zinc-500">Lädt…</p>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : requested || data?.boost?.status === "pending" ? (
              <div className="text-sm text-zinc-300">
                <p className="mb-1 font-medium text-white">Anfrage gesendet.</p>
                <p className="text-zinc-400">Wir melden uns wegen der Zahlungsabwicklung, dann geht der Boost live.</p>
              </div>
            ) : data?.boost?.status === "active" ? (
              <div className="text-sm text-zinc-300">
                <p className="mb-1 inline-flex items-center gap-1 font-medium text-orange-400">
                  <Rocket size={14} /> Boost ist aktiv.
                </p>
                {data.boost.expiresAt && (
                  <p className="text-zinc-400">Läuft bis {new Date(data.boost.expiresAt).toLocaleString("de-AT")}.</p>
                )}
              </div>
            ) : (
              data && (
                <div>
                  <p className="mb-3 text-sm text-zinc-300">
                    Dein Pitch bekommt {data.durationHours}h lang mehr Sichtbarkeit im „Für dich“-Feed — für{" "}
                    {formatPrice(data.priceCents)}.
                  </p>
                  <p className="mb-4 text-xs text-zinc-500">
                    Zahlung läuft aktuell noch manuell — nach deiner Anfrage meldet sich das Team bei dir.
                  </p>
                  <button
                    onClick={submitRequest}
                    disabled={loading}
                    className="w-full rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {loading ? "…" : `Boost für ${formatPrice(data.priceCents)} anfragen`}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
