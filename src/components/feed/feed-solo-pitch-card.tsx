"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FollowButton } from "@/components/brand/follow-button";
import { PitchChallengeButton } from "@/components/pitches/pitch-challenge-button";
import { BoostButton } from "@/components/pitches/boost-button";
import { ReportButton } from "@/components/moderation/report-button";
import { SoloPitchOwnerMenuButton } from "@/components/pitches/solo-pitch-owner-menu-button";
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
  onClose,
  onUpdated,
  onDeleted,
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
  /** Phase 32: only passed when this card is shown standalone (profile grid's single-post view) — renders a close "✕" instead of living inline in a scroll list. */
  onClose?: () => void;
  /** Phase 32: owner-only edit (via the "⋮" menu) needs to patch the card's data in whatever list/state renders it. */
  onUpdated?: (patch: Partial<FeedSoloPitch>) => void;
  onDeleted?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const trackedView = useRef(false);
  // Phase 32: tap now pauses/resumes (Luca: "wie bei Insta") instead of
  // toggling mute — mute moved into this same pause overlay as a smaller,
  // secondary button, replacing the old always-visible top-right icon.
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
    if (!inView || trackedView.current) return;
    trackedView.current = true;
    trackAnalyticsEvent(pitch.brandId, "view");
  }, [inView, pitch.brandId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (inView && !manuallyPaused) video.play().catch(() => {});
    else video.pause();
  }, [inView, muted, manuallyPaused]);

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
      <div className="absolute inset-0" onClick={() => setManuallyPaused((p) => !p)} />

      {manuallyPaused && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-3xl text-white">
            ▶
          </span>
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Ton an" : "Ton aus"}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg text-white"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white"
        >
          ✕
        </button>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-24 pr-20">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/brands/${pitch.brandSlug}`} className="text-sm font-bold text-white hover:underline">
            {pitch.brandName}
          </Link>
          {!pitch.viewerOwnsThisBrand && isLoggedIn && (
            <FollowButton brandId={pitch.brandId} isFollowing={pitch.viewerFollowsBrand} />
          )}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">Solo-Pitch</span>
          {pitch.boosted && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">🚀 Boost</span>
          )}
        </div>
        {pitch.description && <p className="mb-2 text-sm text-white/90">{pitch.description}</p>}
        {pitch.ctaUrl && pitch.ctaLabel && (
          <a
            href={pitch.ctaUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-500"
          >
            {pitch.ctaLabel} →
          </a>
        )}
        {viewerHasOtherBrand && <PitchChallengeButton soloPitchId={pitch.soloPitchId} />}
        {pitch.viewerOwnsThisBrand && <BoostButton soloPitchId={pitch.soloPitchId} />}
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

        {pitch.viewerOwnsThisBrand ? (
          <SoloPitchOwnerMenuButton
            pitch={pitch}
            onUpdated={(patch) => onUpdated?.(patch)}
            onDeleted={() => onDeleted?.()}
          />
        ) : (
          <ReportButton targetType="solo_pitch" targetId={pitch.soloPitchId} isLoggedIn={isLoggedIn} />
        )}
      </div>
    </div>
  );
}
