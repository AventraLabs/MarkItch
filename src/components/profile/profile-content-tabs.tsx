"use client";

import { useState } from "react";
import { SoloPitchGrid } from "@/components/profile/solo-pitch-grid";
import { DuelGrid } from "@/components/profile/duel-grid";
import type { FeedSoloPitch, FeedDuel } from "@/lib/feed";

/**
 * Phase 38: Luca's report — a profile only ever showed Solo-Pitches, never
 * the duels a brand actually took part in ("jedes Profil muss alle Videos
 * bei sich in den Kacheln haben, auch die Duell Videos"). Two tabs right
 * above the grid, Instagram-style (Reels vs. Posts), instead of mixing both
 * content types into one grid.
 *
 * Phase 40: the old pre-Solo-Pitch "Vorstellungsvideo" (brands.videoUrl)
 * that used to show here when a brand had no real Solo-Pitch yet is gone —
 * Luca: "das braucht keiner... es soll im Profil unter Videos einfach die
 * ganzen Solo-Pitch-Videos sein." The whole concept (settings upload form,
 * the counter-invite fallback) is retired, not just its display here.
 */
export function ProfileContentTabs({
  soloPitches,
  duels,
  profileBrandId,
  isLoggedIn,
  viewerBrandId,
}: {
  soloPitches: FeedSoloPitch[];
  duels: FeedDuel[];
  profileBrandId: string;
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
}) {
  const [tab, setTab] = useState<"solo" | "duels">("solo");

  return (
    <div>
      <div className="mb-3 flex border-b border-zinc-800 text-sm font-medium">
        <button
          onClick={() => setTab("solo")}
          className={`flex-1 border-b-2 py-2.5 ${tab === "solo" ? "border-orange-500 text-white" : "border-transparent text-zinc-500"}`}
        >
          Videos ({soloPitches.length})
        </button>
        <button
          onClick={() => setTab("duels")}
          className={`flex-1 border-b-2 py-2.5 ${tab === "duels" ? "border-orange-500 text-white" : "border-transparent text-zinc-500"}`}
        >
          Duelle ({duels.length})
        </button>
      </div>

      {tab === "solo" ? (
        soloPitches.length > 0 ? (
          <SoloPitchGrid initialPitches={soloPitches} isLoggedIn={isLoggedIn} viewerBrandId={viewerBrandId} />
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Noch keine Videos gepostet.</p>
        )
      ) : duels.length > 0 ? (
        <DuelGrid duels={duels} isLoggedIn={isLoggedIn} ownBrandId={profileBrandId} />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">Noch keine Duelle.</p>
      )}
    </div>
  );
}
