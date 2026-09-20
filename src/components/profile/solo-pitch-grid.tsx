"use client";

import { useState } from "react";
import { StandaloneSoloPitchView } from "@/components/profile/standalone-solo-pitch-view";
import type { FeedSoloPitch } from "@/lib/feed";

// Phase 32: forces the browser to actually decode and show a frame instead
// of a solid black rectangle — `preload="metadata"` alone only guarantees
// duration/dimensions, not a rendered frame, in every browser. Seeking a
// hair into the clip once metadata is known is the standard trick.
function showFirstFrame(video: HTMLVideoElement) {
  if (video.readyState >= 1) video.currentTime = 0.1;
  else video.addEventListener("loadedmetadata", () => (video.currentTime = 0.1), { once: true });
}

/**
 * Phase 30/32: a tile grid of muted video thumbnails — clicking one opens
 * the exact same full-screen FeedSoloPitchCard the main feed uses (Luca:
 * "muss genau gleich aussehen wie im Feed"), via StandaloneSoloPitchView.
 */
export function SoloPitchGrid({
  initialPitches,
  isLoggedIn,
  viewerBrandId,
}: {
  initialPitches: FeedSoloPitch[];
  isLoggedIn: boolean;
  viewerBrandId?: string | null;
}) {
  const [pitches, setPitches] = useState(initialPitches);
  const [openId, setOpenId] = useState<string | null>(null);

  const openPitch = pitches.find((p) => p.soloPitchId === openId) ?? null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {pitches.map((pitch) => (
          <li key={pitch.soloPitchId}>
            <button onClick={() => setOpenId(pitch.soloPitchId)} className="block w-full">
              <video
                ref={(el) => {
                  if (el) showFirstFrame(el);
                }}
                src={pitch.videoUrl}
                muted
                playsInline
                preload="metadata"
                className="aspect-[9/16] w-full rounded-lg bg-black object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {openPitch && (
        <StandaloneSoloPitchView
          pitch={openPitch}
          isLoggedIn={isLoggedIn}
          viewerHasOtherBrand={Boolean(viewerBrandId && viewerBrandId !== openPitch.brandId)}
          onClose={() => setOpenId(null)}
          onUpdated={(patch) =>
            setPitches((prev) => prev.map((p) => (p.soloPitchId === openPitch.soloPitchId ? { ...p, ...patch } : p)))
          }
          onDeleted={() => {
            setPitches((prev) => prev.filter((p) => p.soloPitchId !== openPitch.soloPitchId));
            setOpenId(null);
          }}
        />
      )}
    </>
  );
}
