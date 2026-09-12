"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ReactionWithBrand } from "@/lib/reaction";
import { ReactionUploadForm } from "@/components/pitches/reaction-upload-form";
import { PromoteReactionButton } from "@/components/pitches/promote-reaction-button";

type ReactionRow = Omit<ReactionWithBrand, "createdAt"> & { createdAt: string };

export function ReactionsSheet({
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
    <div className="absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[80%] w-full flex-col rounded-t-2xl bg-zinc-950 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Reaktionen {reactions && reactions.length > 0 ? `(${reactions.length})` : ""}
          </h2>
          <button onClick={onClose} aria-label="Schließen" className="text-lg text-zinc-500 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {reactions === null ? (
            <p className="text-sm text-zinc-600">Lädt…</p>
          ) : reactions.length === 0 ? (
            <p className="text-sm text-zinc-600">Noch keine Reaktionen — sei die erste Marke.</p>
          ) : (
            <ul className="space-y-4">
              {reactions.map((r) => (
                <li key={r.id} className="rounded-xl border border-zinc-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Link href={`/brands/${r.brand.slug}`} className="text-sm font-semibold text-white hover:underline">
                      {r.brand.name}
                    </Link>
                    {r.promotedToBattleId && (
                      <Link href={`/pitches/${r.promotedToBattleId}`} className="text-xs text-orange-400 hover:underline">
                        Duell ansehen →
                      </Link>
                    )}
                  </div>
                  <video
                    src={r.videoUrl}
                    className="mb-2 max-h-64 w-full rounded-lg bg-black object-contain"
                    controls
                    playsInline
                    preload="metadata"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => (isLoggedIn ? handleToggleLike(r.id) : (window.location.href = "/login"))}
                      className="flex items-center gap-1 text-sm"
                    >
                      <span>{r.viewerLiked ? "❤️" : "🤍"}</span>
                      <span className="text-xs font-medium text-white">{r.likeCount}</span>
                    </button>
                    {canPromote && !r.promotedToBattleId && <PromoteReactionButton reactionId={r.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canPostReaction && (
          <div className="border-t border-zinc-800 p-3">
            <ReactionUploadForm soloPitchId={soloPitchId} onPosted={load} />
          </div>
        )}
      </div>
    </div>
  );
}
