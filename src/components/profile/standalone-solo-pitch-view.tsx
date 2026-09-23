"use client";

import { useState } from "react";
import { FeedSoloPitchCard } from "@/components/feed/feed-solo-pitch-card";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";
import { ReactionsOverlay } from "@/components/pitches/reactions-overlay";
import type { FeedSoloPitch } from "@/lib/feed";

/**
 * Phase 32: opened from a profile grid tile (own /profile or someone else's
 * /brands/[slug]) — Luca: "muss genau gleich aussehen wie im Feed" (like,
 * comment, everything). This is a thin standalone host for the exact same
 * FeedSoloPitchCard the main feed uses, with its own tiny copy of the
 * like/comment/reaction/mute wiring FeedClient normally owns — there's no
 * shared feed list here, just one post shown fullscreen.
 */
export function StandaloneSoloPitchView({
  pitch: initialPitch,
  isLoggedIn,
  viewerHasOtherBrand,
  viewerBrandId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  pitch: FeedSoloPitch;
  isLoggedIn: boolean;
  viewerHasOtherBrand: boolean;
  viewerBrandId?: string | null;
  onClose: () => void;
  onUpdated: (patch: Partial<FeedSoloPitch>) => void;
  onDeleted: () => void;
}) {
  const [pitch, setPitch] = useState(initialPitch);
  const [muted, setMuted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);

  function patch(p: Partial<FeedSoloPitch>) {
    setPitch((prev) => ({ ...prev, ...p }));
  }

  async function handleToggleLike() {
    patch({ viewerLiked: !pitch.viewerLiked, likeCount: pitch.likeCount + (pitch.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloPitchId: pitch.soloPitchId }),
      });
      const data = await res.json();
      if (res.ok) patch({ viewerLiked: data.liked, likeCount: data.count });
      else patch({ viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    } catch {
      patch({ viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/?pitch=${pitch.soloPitchId}`;
    const shareData = { title: `${pitch.brandName} auf MarkItch`, url };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <FeedSoloPitchCard
        pitch={pitch}
        isLoggedIn={isLoggedIn}
        viewerHasOtherBrand={viewerHasOtherBrand}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onToggleLike={handleToggleLike}
        onOpenComments={() => setCommentTarget({ kind: "solo", id: pitch.soloPitchId })}
        onOpenReactions={() => setReactionsOpen(true)}
        onShare={handleShare}
        onClose={onClose}
        onUpdated={(p) => {
          patch(p);
          onUpdated(p);
        }}
        onDeleted={onDeleted}
      />

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          isLoggedIn={isLoggedIn}
          onClose={() => setCommentTarget(null)}
          onCommentPosted={() => patch({ commentCount: pitch.commentCount + 1 })}
        />
      )}

      {reactionsOpen && (
        <ReactionsOverlay
          soloPitchId={pitch.soloPitchId}
          isLoggedIn={isLoggedIn}
          canPostReaction={viewerHasOtherBrand}
          canPromote={pitch.viewerOwnsThisBrand}
          viewerBrandId={viewerBrandId}
          onClose={() => setReactionsOpen(false)}
          onReactionCountChange={(_id, count) => patch({ reactionCount: count })}
        />
      )}
    </div>
  );
}
