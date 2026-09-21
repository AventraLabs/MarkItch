"use client";

import Link from "next/link";
import type { ProfileDuelTile } from "@/lib/battle";

// Phase 38: same seek-a-hair-in trick as SoloPitchGrid's thumbnails —
// `preload="metadata"` alone often only guarantees duration/dimensions, not
// an actually rendered (visible) frame.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

/**
 * Phase 38: the profile grid's "Duelle" tab — a brand's own live/finished
 * battles, shown with *its own* side's video as the thumbnail. Clicking one
 * deep-links into the real feed (`/?battle=<id>`), reusing the existing
 * FeedDuelCard there instead of building a second, parallel duel viewer —
 * same established pattern as share links and notifications.
 */
export function DuelGrid({ duels }: { duels: ProfileDuelTile[] }) {
  return (
    <ul className="grid grid-cols-3 gap-1">
      {duels.map((duel) => (
        <li key={duel.battleId}>
          <Link href={`/?battle=${duel.battleId}`} className="relative block w-full" aria-label={`Duell gegen ${duel.opponentName}`}>
            <video
              ref={(el) => {
                if (el) showFirstFrame(el);
              }}
              src={duel.videoUrl}
              muted
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
            />
            <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              vs. {duel.opponentName}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
