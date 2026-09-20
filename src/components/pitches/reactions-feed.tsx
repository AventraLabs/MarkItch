"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { ReactionWithBrand } from "@/lib/reaction";
import { ReactionFeedCard } from "@/components/pitches/reaction-feed-card";
import { ReactionUploadForm } from "@/components/pitches/reaction-upload-form";

type ReactionRow = Omit<ReactionWithBrand, "createdAt"> & { createdAt: string };

/**
 * Phase 34: full-screen, scrollable feed of a solo pitch's reactions —
 * replaces the old small bottom sheet (ReactionsSheet). Luca: "wie bei
 * TikTok, wenn man auf den Sound klickt, ein neues Fenster wie ein neuer
 * Feed." Posting a new reaction moved from an always-visible form at the
 * bottom of a list to a floating "+" that opens the same upload form in a
 * sheet on top of this feed, so the video stack itself stays full-screen.
 */
export function ReactionsFeed({
  soloPitchId,
  isLoggedIn,
  canPostReaction,
  canPromote,
  onClose,
  onReactionCountChange,
}: {
  soloPitchId: string;
  isLoggedIn: boolean;
  canPostReaction: boolean;
  canPromote: boolean;
  onClose: () => void;
  onReactionCountChange: (soloPitchId: string, count: number) => void;
}) {
  const [reactions, setReactions] = useState<ReactionRow[] | null>(null);
  const [muted, setMuted] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/pitches/reactions?soloPitchId=${soloPitchId}`)
      .then((res) => res.json())
      .then((data) => {
        const list: ReactionRow[] = data.reactions ?? [];
        setReactions(list);
        onReactionCountChange(soloPitchId, list.length);
      })
      .catch(() => setReactions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onReactionCountChange is a stable setter from the parent
  }, [soloPitchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleLike(reactionId: string) {
    setReactions((prev) =>
      prev?.map((r) => (r.id === reactionId ? { ...r, viewerLiked: !r.viewerLiked, likeCount: r.likeCount + (r.viewerLiked ? -1 : 1) } : r)) ?? null,
    );
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setReactions((prev) => prev?.map((r) => (r.id === reactionId ? { ...r, viewerLiked: data.liked, likeCount: data.count } : r)) ?? null);
      } else {
        load();
      }
    } catch {
      load();
    }
  }

  return (
    // z-[60]: sits above other fixed overlays (StandaloneSoloPitchView,
    // CommentSheet, etc. all use z-50) since this can be opened from within
    // the profile grid's own full-screen post view.
    <div className="fixed inset-0 z-[60] bg-black">
      <button
        onClick={onClose}
        aria-label="Schließen"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X size={18} />
      </button>

      {reactions === null ? (
        <div className="flex h-dvh w-full items-center justify-center">
          <p className="text-sm text-zinc-500">Lädt…</p>
        </div>
      ) : reactions.length === 0 ? (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-sm text-zinc-500">Noch keine Reaktionen — sei die erste Marke.</p>
          {canPostReaction && (
            <button
              onClick={() => setUploadOpen(true)}
              className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              Reaktion posten
            </button>
          )}
        </div>
      ) : (
        <div className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll">
          {reactions.map((r) => (
            <ReactionFeedCard
              key={r.id}
              reaction={r}
              isLoggedIn={isLoggedIn}
              canPromote={canPromote}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}

      {canPostReaction && reactions !== null && reactions.length > 0 && (
        <button
          onClick={() => setUploadOpen(true)}
          aria-label="Reaktion posten"
          className="absolute bottom-24 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-500"
        >
          <Plus size={24} />
        </button>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setUploadOpen(false)}>
          <div
            className="w-full rounded-t-2xl bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Reaktion posten</h2>
              <button onClick={() => setUploadOpen(false)} aria-label="Schließen" className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <ReactionUploadForm
              soloPitchId={soloPitchId}
              onPosted={() => {
                setUploadOpen(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
