"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FollowButton } from "@/components/brand/follow-button";
import { PitchChallengeButton } from "@/components/pitches/pitch-challenge-button";
import type { FeedSoloPitch } from "@/lib/feed";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

export function FeedSoloPitchCard({
  pitch,
  isLoggedIn,
  viewerHasOtherBrand,
  muted,
  onToggleMute,
  onToggleLike,
  onOpenComments,
  onOpenReactions,
  onShare,
}: {
  pitch: FeedSoloPitch;
  isLoggedIn: boolean;
  /** Viewer owns a brand, and it isn't this pitch's own — gate for "Pitch schicken". */
  viewerHasOtherBrand: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleLike: (pitch: FeedSoloPitch) => void;
  onOpenComments: (soloPitchId: string) => void;
  onOpenReactions: (soloPitchId: string) => void;
  onShare: (pitch: FeedSoloPitch) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const trackedView = useRef(false);

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
    if (!inView || trackedView.current) return;
    trackedView.current = true;
    trackAnalyticsEvent(pitch.brandId, "view");
  }, [inView, pitch.brandId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (inView) video.play().catch(() => {});
    else video.pause();
  }, [inView, muted]);

  function handleShare() {
    onShare(pitch);
    trackAnalyticsEvent(pitch.brandId, "share");
    setShareLabel("Link kopiert!");
    setTimeout(() => setShareLabel(null), 1800);
  }

  return (
    <div
      ref={containerRef}
      data-solo-pitch-id={pitch.soloPitchId}
      className="relative h-dvh w-full snap-start snap-always bg-black"
    >
      <video
        ref={videoRef}
        src={pitch.videoUrl}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0" onClick={onToggleMute} />

      <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/40 px-2 py-1 text-xs text-white">
        {muted ? "🔇" : "🔊"}
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-24 pr-20">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/brands/${pitch.brandSlug}`} className="text-sm font-bold text-white hover:underline">
            {pitch.brandName}
          </Link>
          {!pitch.viewerOwnsThisBrand && isLoggedIn && (
            <FollowButton brandId={pitch.brandId} isFollowing={pitch.viewerFollowsBrand} />
          )}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">Solo-Pitch</span>
        </div>
        {viewerHasOtherBrand && <PitchChallengeButton soloPitchId={pitch.soloPitchId} />}
      </div>

      <div className="pointer-events-auto absolute bottom-40 right-3 flex flex-col items-center gap-5">
        <button
          onClick={() => (isLoggedIn ? onToggleLike(pitch) : (window.location.href = "/login"))}
          className="flex flex-col items-center gap-1"
          aria-label="Like"
        >
          <span className="text-3xl">{pitch.viewerLiked ? "❤️" : "🤍"}</span>
          <span className="text-xs font-medium text-white">{pitch.likeCount}</span>
        </button>

        <button onClick={() => onOpenComments(pitch.soloPitchId)} className="flex flex-col items-center gap-1">
          <span className="text-3xl">💬</span>
          <span className="text-xs font-medium text-white">{pitch.commentCount}</span>
        </button>

        <button onClick={() => onOpenReactions(pitch.soloPitchId)} className="flex flex-col items-center gap-1">
          <span className="text-3xl">🔁</span>
          <span className="text-xs font-medium text-white">{pitch.reactionCount}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <span className="text-3xl">↗️</span>
          <span className="text-xs font-medium text-white">{shareLabel ? "Kopiert" : "Teilen"}</span>
        </button>
      </div>
    </div>
  );
}
