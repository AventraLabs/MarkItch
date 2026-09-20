"use client";

import { useState } from "react";
import { SoloPitchDetailOverlay } from "@/components/profile/solo-pitch-detail-overlay";
import type { SoloPitch } from "@/db/schema";

/**
 * Phase 30: replaces a grid of three full-size `<video controls>` elements
 * crammed side by side (unusable, no way to manage a post) with real
 * thumbnails that open a single-post view on click — see
 * SoloPitchDetailOverlay for play/pause, edit, delete.
 */
export function SoloPitchGrid({ initialPitches }: { initialPitches: SoloPitch[] }) {
  const [pitches, setPitches] = useState(initialPitches);
  const [openId, setOpenId] = useState<string | null>(null);

  const openPitch = pitches.find((p) => p.id === openId) ?? null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {pitches.map((pitch) => (
          <li key={pitch.id}>
            <button onClick={() => setOpenId(pitch.id)} className="block w-full">
              <video
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
        <SoloPitchDetailOverlay
          pitch={openPitch}
          onClose={() => setOpenId(null)}
          onUpdated={(patch) => setPitches((prev) => prev.map((p) => (p.id === openPitch.id ? { ...p, ...patch } : p)))}
          onDeleted={() => {
            setPitches((prev) => prev.filter((p) => p.id !== openPitch.id));
            setOpenId(null);
          }}
        />
      )}
    </>
  );
}
