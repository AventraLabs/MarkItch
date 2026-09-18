"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedDuel, FeedItem, FeedPage, FeedSoloPitch } from "@/lib/feed";
import { FeedDuelCard } from "@/components/feed/feed-duel-card";
import { FeedSoloPitchCard } from "@/components/feed/feed-solo-pitch-card";
import { CommentSheet, type CommentTarget } from "@/components/feed/comment-sheet";
import { ReactionsSheet } from "@/components/pitches/reactions-sheet";
import { getNotificationPermission, subscribeToPush } from "@/lib/push-client";

type Tab = "foryou" | "following";

export function FeedClient({
  initialItems,
  initialTotal,
  isLoggedIn,
  viewerBrandId,
  focusBattleId,
}: {
  initialItems: FeedItem[];
  initialTotal: number;
  isLoggedIn: boolean;
  /** Viewer's own brand id, if they have one — gates "Pitch schicken"/"Hochstufen" without a per-card query. */
  viewerBrandId?: string | null;
  focusBattleId?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("foryou");
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [muted, setMuted] = useState(true);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [reactionsSoloPitchId, setReactionsSoloPitchId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadTab = useCallback(async (nextTab: Tab) => {
    setLoading(true);
    setRequiresLogin(false);
    try {
      const res = await fetch(`/api/feed?tab=${nextTab}&offset=0`);
      const data: FeedPage & { requiresLogin?: boolean } = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setRequiresLogin(Boolean(data.requiresLogin));
    } finally {
      setLoading(false);
    }
  }, []);

  function handleTabChange(nextTab: Tab) {
    if (nextTab === tab) return;
    setTab(nextTab);
    loadTab(nextTab);
  }

  const loadMore = useCallback(async () => {
    if (loadingRef.current || items.length >= total) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${tab}&offset=${items.length}`);
      const data: FeedPage = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.key));
        return [...prev, ...data.items.filter((i) => !seen.has(i.key))];
      });
      setTotal(data.total);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [tab, items.length, total]);

  // Phase 10: deep-link from a notification/reminder — land straight on
  // that Pitch's card instead of the top of the ranked feed. Runs once;
  // page.tsx already guaranteed the card is in `initialItems`.
  useEffect(() => {
    if (!focusBattleId) return;
    const target =
      document.querySelector(`[data-battle-id="${focusBattleId}"]`) ??
      document.querySelector(`[data-solo-pitch-id="${focusBattleId}"]`);
    target?.scrollIntoView({ behavior: "auto", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally once, on mount
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200% 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  function patchDuel(key: string, patch: Partial<FeedDuel>) {
    setItems((prev) => prev.map((item) => (item.kind === "duel" && item.key === key ? { ...item, ...patch } : item)));
  }

  function patchSide(key: string, sideIndex: 0 | 1, patch: Partial<FeedDuel["sides"][number]>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind !== "duel" || item.key !== key) return item;
        const sides = [...item.sides] as FeedDuel["sides"];
        sides[sideIndex] = { ...sides[sideIndex], ...patch };
        return { ...item, sides };
      }),
    );
  }

  function patchSolo(soloPitchId: string, patch: Partial<FeedSoloPitch>) {
    setItems((prev) =>
      prev.map((item) => (item.kind === "solo" && item.soloPitchId === soloPitchId ? { ...item, ...patch } : item)),
    );
  }

  async function handleToggleLike(duel: FeedDuel, sideIndex: 0 | 1) {
    const side = duel.sides[sideIndex];
    // Optimistic update — a heart-tap should feel instant.
    patchSide(duel.key, sideIndex, { viewerLiked: !side.viewerLiked, likeCount: side.likeCount + (side.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/feed/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: duel.battleId, brandId: side.brandId }),
      });
      const data = await res.json();
      if (res.ok) {
        patchSide(duel.key, sideIndex, { viewerLiked: data.liked, likeCount: data.count });
      } else {
        // Roll back on failure (e.g. session expired mid-scroll).
        patchSide(duel.key, sideIndex, { viewerLiked: side.viewerLiked, likeCount: side.likeCount });
      }
    } catch {
      patchSide(duel.key, sideIndex, { viewerLiked: side.viewerLiked, likeCount: side.likeCount });
    }
  }

  async function handleVote(duel: FeedDuel, sideIndex: 0 | 1) {
    const side = duel.sides[sideIndex];
    try {
      const res = await fetch("/api/feed/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: duel.battleId, votedForBrandId: side.brandId }),
      });
      const data = await res.json();
      if (res.ok && data.tally) {
        patchDuel(duel.key, { tally: data.tally, viewerVotedBrandId: data.votedForBrandId });
        maybeOfferPushPrompt();
      }
    } catch {
      // Silent — the button just stays clickable, no state changed.
    }
  }

  // Phase 12d: no custom "möchtest du Benachrichtigungen?" question of our
  // own — the point of push is that voting is the only thing a viewer has
  // to do, the result finds them. We go straight for subscribeToPush(),
  // which itself triggers the browser's own native permission dialog; that
  // one dialog is unavoidable (no site can silently enable push — it's a
  // hard browser security boundary, not a product choice), but it's the
  // *only* prompt now, fired the moment it's obviously relevant: right
  // after a viewer's first vote. `mm_push_prompted` (localStorage) makes
  // this a one-time attempt even across sessions, whatever the browser's
  // dialog resolves to.
  function maybeOfferPushPrompt() {
    if (getNotificationPermission() !== "default") return; // already decided (granted/denied) or unsupported — nothing to do
    try {
      if (localStorage.getItem("mm_push_prompted")) return;
      localStorage.setItem("mm_push_prompted", "1");
    } catch {
      return; // can't remember the attempt reliably — safer to just not ask
    }
    void subscribeToPush();
  }

  function shareUrl(url: string, title: string) {
    const shareData = { title, url };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function handleShare(duel: FeedDuel) {
    // Phase 17: /battles/[id] is the canonical share link now — it carries
    // a proper preview card (opengraph-image.tsx) for chat apps/socials,
    // and bounces a human visitor onward to wherever the Duell actually
    // lives (feed or waiting room) if it isn't a finished result.
    shareUrl(
      `${window.location.origin}/battles/${duel.battleId}`,
      `${duel.sides[0].brandName} vs. ${duel.sides[1].brandName} auf MarkItch`,
    );
  }

  function handleShareSolo(pitch: FeedSoloPitch) {
    shareUrl(`${window.location.origin}/?pitch=${pitch.soloPitchId}`, `${pitch.brandName} auf MarkItch`);
  }

  async function handleToggleLikeSolo(pitch: FeedSoloPitch) {
    patchSolo(pitch.soloPitchId, { viewerLiked: !pitch.viewerLiked, likeCount: pitch.likeCount + (pitch.viewerLiked ? -1 : 1) });
    try {
      const res = await fetch("/api/pitches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloPitchId: pitch.soloPitchId }),
      });
      const data = await res.json();
      if (res.ok) {
        patchSolo(pitch.soloPitchId, { viewerLiked: data.liked, likeCount: data.count });
      } else {
        patchSolo(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
      }
    } catch {
      patchSolo(pitch.soloPitchId, { viewerLiked: pitch.viewerLiked, likeCount: pitch.likeCount });
    }
  }

  function handleCommentPosted(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind === "duel" && item.battleId === id) return { ...item, commentCount: item.commentCount + 1 };
        if (item.kind === "solo" && item.soloPitchId === id) return { ...item, commentCount: item.commentCount + 1 };
        return item;
      }),
    );
  }

  function handleReactionCountChange(soloPitchId: string, count: number) {
    patchSolo(soloPitchId, { reactionCount: count });
  }

  const showEmptyFollowing = tab === "following" && !loading && items.length === 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* Tabs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center gap-6 pt-[calc(env(safe-area-inset-top)+14px)]">
        {(
          [
            ["foryou", "Feed"],
            ["following", "Folge ich"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`pointer-events-auto text-sm font-semibold drop-shadow ${
              tab === key ? "text-white" : "text-white/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll">
        {items.map((item) =>
          item.kind === "duel" ? (
            <FeedDuelCard
              key={item.key}
              duel={item}
              isLoggedIn={isLoggedIn}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLike}
              onVote={handleVote}
              onOpenComments={(battleId) => setCommentTarget({ kind: "battle", id: battleId })}
              onShare={handleShare}
            />
          ) : (
            <FeedSoloPitchCard
              key={item.key}
              pitch={item}
              isLoggedIn={isLoggedIn}
              viewerHasOtherBrand={Boolean(viewerBrandId && viewerBrandId !== item.brandId)}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onToggleLike={handleToggleLikeSolo}
              onOpenComments={(soloPitchId) => setCommentTarget({ kind: "solo", id: soloPitchId })}
              onOpenReactions={setReactionsSoloPitchId}
              onShare={handleShareSolo}
            />
          ),
        )}
        <div ref={sentinelRef} className="h-1 w-full" />

        {items.length === 0 && !loading && !showEmptyFollowing && (
          <div className="flex h-dvh w-full flex-col items-center justify-center px-8 text-center">
            <p className="text-lg font-semibold text-white">Noch keine Pitches</p>
            <p className="mt-2 text-sm text-zinc-400">
              Sobald jemand einen Solo-Pitch postet oder ein Duell live geht, taucht es hier auf.
            </p>
          </div>
        )}

        {showEmptyFollowing && (
          <div className="flex h-dvh w-full flex-col items-center justify-center px-8 text-center">
            <p className="text-lg font-semibold text-white">
              {requiresLogin ? "Melde dich an" : "Folge ein paar Marken"}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {requiresLogin
                ? "Melde dich an, um zu sehen, wenn Marken, denen du folgst, einen neuen Pitch posten."
                : "Sobald du Marken folgst, siehst du hier ihre neuesten Pitches zuerst."}
            </p>
            <a
              href={requiresLogin ? "/login" : "/brands"}
              className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
            >
              {requiresLogin ? "Anmelden" : "Marken entdecken"}
            </a>
          </div>
        )}
      </div>

      {commentTarget && (
        <CommentSheet
          target={commentTarget}
          isLoggedIn={isLoggedIn}
          onClose={() => setCommentTarget(null)}
          onCommentPosted={handleCommentPosted}
        />
      )}

      {reactionsSoloPitchId &&
        (() => {
          const pitch = items.find((i) => i.kind === "solo" && i.soloPitchId === reactionsSoloPitchId) as
            | FeedSoloPitch
            | undefined;
          return (
            <ReactionsSheet
              soloPitchId={reactionsSoloPitchId}
              isLoggedIn={isLoggedIn}
              canPostReaction={Boolean(viewerBrandId && pitch && viewerBrandId !== pitch.brandId)}
              canPromote={Boolean(viewerBrandId && pitch && viewerBrandId === pitch.brandId)}
              onClose={() => setReactionsSoloPitchId(null)}
              onReactionCountChange={handleReactionCountChange}
            />
          );
        })()}
    </div>
  );
}
