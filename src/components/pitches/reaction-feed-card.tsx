"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Play, Volume2, VolumeX } from "lucide-react";
import { PromoteReactionButton } from "@/components/pitches/promote-reaction-button";
import { ReportButton } from "@/components/moderation/report-button";
import type { ReactionWithBrand } from "@/lib/reaction";

type ReactionRow = Omit<ReactionWithBrand, "createdAt"> & { createdAt: string };

/**
 * Phase 34: one reaction, full-screen — same visual language as
 * FeedSoloPitchCard (tap to pause, mute only shown while paused) instead of
 * a cramped list-item video. Luca: "wie bei TikTok... man soll da auch
 * normal liken... können." Comments are deliberately not here — reactions
 * never got their own comment thread (see schema.ts's comment on
 * `comments`, "discussion stays on the pitch itself"), a real schema
 * addition if that's wanted later, not part of this pass.
 */
export function ReactionFeedCard({
  reaction,
  isLoggedIn,
  canPromote,
  muted,
  onToggleMute,
  onToggleLike,
}: {
  reaction: ReactionRow;
  isLoggedIn: boolean;
  canPromote: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (reactionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6);
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (inView && !manuallyPaused) video.play().catch(() => {});
    else video.pause();
  }, [inView, muted, manuallyPaused]);

  return (
    <div ref={containerRef} className="relative h-dvh w-full snap-start snap-always bg-black">
      <video
        ref={videoRef}
        src={reaction.videoUrl}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0" onClick={() => setManuallyPaused((p) => !p)} />

      {manuallyPaused && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
            <Play size={28} fill="currentColor" />
          </span>
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Ton an" : "Ton aus"}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-24 pr-20">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/brands/${reaction.brand.slug}`} className="text-sm font-bold text-white hover:underline">
            {reaction.brand.name}
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">Reaktion</span>
        </div>
        {reaction.promotedToBattleId && (
          <Link href={`/pitches/${reaction.promotedToBattleId}`} className="text-sm text-orange-400 hover:underline">
            Duell ansehen →
          </Link>
        )}
        {canPromote && !reaction.promotedToBattleId && <PromoteReactionButton reactionId={reaction.id} />}
      </div>

      <div className="pointer-events-auto absolute bottom-40 right-3 flex flex-col items-center gap-5">
        <button
          onClick={() => (isLoggedIn ? onToggleLike(reaction.id) : (window.location.href = "/login"))}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Like"
        >
          <Heart size={30} className={reaction.viewerLiked ? "fill-red-500 text-red-500" : ""} />
          <span className="text-xs font-medium">{reaction.likeCount}</span>
        </button>

        <ReportButton targetType="reaction" targetId={reaction.id} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
