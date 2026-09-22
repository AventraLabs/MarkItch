"use client";

import { useState } from "react";
import { SoloPitchGrid } from "@/components/profile/solo-pitch-grid";
import { DuelGrid } from "@/components/profile/duel-grid";
import { VideoPlayer } from "@/components/brand/video-player";
import type { FeedSoloPitch } from "@/lib/feed";
import type { ProfileDuelTile } from "@/lib/battle";

/**
 * Phase 38: Luca's report — a profile only ever showed Solo-Pitches, never
 * the duels a brand actually took part in ("jedes Profil muss alle Videos
 * bei sich in den Kacheln haben, auch die Duell Videos"). Two tabs right
 * above the grid, Instagram-style (Reels vs. Posts), instead of mixing both
 * content types into one grid.
 *
 * Phase 39: `legacyVideoUrl` (a brand's pre-Solo-Pitch showcase video, see
 * schema.ts's `brands.videoUrl`) used to render as its own separate,
 * unlabeled-in-context card below the whole grid — Luca: "wieso ist das
 * nicht einfach im Tab Videos?". Now it lives inside the Videos tab itself,
 * only shown when there's no real Solo-Pitch yet (once a brand posts a
 * real one, the legacy video stops being the "first thing you see" here —
 * it's still reachable from a brand's own settings/counter-mechanic, just
 * not duplicated in two places on the profile).
 */
export function ProfileContentTabs({
  soloPitches,
  duels,
  isLoggedIn,
  viewerBrandId,
  legacyVideoUrl,
}: {
  soloPitches: FeedSoloPitch[];
  duels: ProfileDuelTile[];
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
  legacyVideoUrl?: string | null;
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
        ) : legacyVideoUrl ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Vorstellungsvideo</p>
            <div className="mx-auto max-w-[280px]">
              <VideoPlayer src={legacyVideoUrl} />
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">Noch keine Videos gepostet.</p>
        )
      ) : duels.length > 0 ? (
        <DuelGrid duels={duels} />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">Noch keine Duelle.</p>
      )}
    </div>
  );
}
