"use client";

import { useState } from "react";
import { StandaloneDuelFeed } from "@/components/profile/standalone-duel-feed";
import type { FeedDuel } from "@/lib/feed";

// Phase 38: same seek-a-hair-in trick as SoloPitchGrid's thumbnails —
// `preload="metadata"` alone often only guarantees duration/dimensions, not
// an actually rendered (visible) frame.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

/**
 * Phase 38: the profile grid's "Duelle" tab — a brand's own live/finished
 * battles, shown with *its own* side's video as the thumbnail.
 *
 * Phase 40: Luca's report — a tile used to deep-link into the *global*
 * feed (`/?battle=<id>`), which dropped the viewer out of this profile
 * entirely. Now opens StandaloneDuelFeed instead — same real FeedDuelCard,
 * full like/vote/comment/share, but its own scrollable stack limited to
 * this brand's own duels, staying on the profile like the "Videos" tab's
 * SoloPitchGrid already does.
 */
export function DuelGrid({ duels, isLoggedIn, ownBrandId }: { duels: FeedDuel[]; isLoggedIn: boolean; ownBrandId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {duels.map((duel, index) => {
          const mySideIndex = duel.sides[0].brandId === ownBrandId ? 0 : 1;
          const mySide = duel.sides[mySideIndex];
          const opponent = duel.sides[mySideIndex === 0 ? 1 : 0];
          return (
            <li key={duel.key}>
              <button onClick={() => setOpenIndex(index)} className="relative block w-full" aria-label={`Duell gegen ${opponent.brandName}`}>
                <video
                  ref={(el) => {
                    if (el) showFirstFrame(el);
                  }}
                  src={mySide.videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
                />
                <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  vs. {opponent.brandName}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {openIndex !== null && (
        <StandaloneDuelFeed duels={duels} startIndex={openIndex} isLoggedIn={isLoggedIn} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
