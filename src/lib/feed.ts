import "server-only";
import { after } from "next/server";
import { getAllBattles, resolveBattleVideos } from "@/lib/battle";
import { getBattleStage } from "@/lib/battle-stage";
import { getVoteTally, getVoteTallyAsOf, getUserVote, type VoteTally } from "@/lib/vote";
import { getLikeCounts, getUserLikedKeys, getSoloPitchLikeCounts, getUserLikedSoloPitchIds } from "@/lib/like";
import { getCommentCounts, getCommentCountsForSoloPitches } from "@/lib/comment";
import { getFollowedBrandIds } from "@/lib/follow";
import { getBrandForUser } from "@/lib/brand";
import { VOTING_WINDOW_MS } from "@/lib/battle-format";
import { finalizeAndNotifyBattle } from "@/lib/battle-notify";
import { getAllSoloPitches } from "@/lib/solo-pitch";
import { getReactionCounts } from "@/lib/reaction";
import { getActiveBoostedSoloPitchIds } from "@/lib/boost";

// Phase 9.1 — one feed entry per Duell (battle), not per side.
//
// Phase 9 originally split a battle into two independent feed cards, one
// per video. Product feedback: that breaks the actual point of a Duell —
// a viewer could scroll past brand A's video and never see brand B's, so
// "vote on this" never really happens. A feed entry now IS the Duell:
// `sides[0]`/`sides[1]` (always brandA/brandB, matching tally.brandAVotes/
// brandBVotes) are both loaded, and the client shows exactly one full-
// screen video at a time — same "one video on screen" feel — but lets the
// viewer flip to the other side without leaving this feed position
// (FeedDuelCard's left/right tap zones). Still nothing pre-reveal ever
// shows up: a card only exists once both sides of its battle are visible
// under the existing Phase 7 "hidden results" rule.
export type FeedDuelSide = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  videoUrl: string;
  likeCount: number;
  viewerLiked: boolean;
  /** Hide the follow button on your own brand's side. */
  viewerOwnsThisBrand: boolean;
  viewerFollowsBrand: boolean;
};

export type FeedDuel = {
  kind: "duel";
  key: string; // battleId — stable across re-fetches
  battleId: string;
  category: string;
  isFinished: boolean;
  votingEndsAt: string | null; // ISO
  revealSplit: boolean;
  /** Live, ever-growing tally — includes votes cast after votingEndsAt too. Drives the running "N Stimmen bisher" count and trending score. */
  tally: VoteTally;
  /**
   * Phase 12: the tally as it stood at votingEndsAt — this is the "official"
   * result once a Pitch is finished, and it never changes afterwards. Null
   * until the Pitch is actually finished. Compare against `tally` to see
   * whether later votes have since shifted the lead.
   */
  officialTally: VoteTally | null;
  commentCount: number;
  viewerVotedBrandId: string | null;
  /** Viewer's own brand is either side of this Duell — can't vote, no follow button on either side. */
  viewerOwnsThisBattle: boolean;
  activatedAt: string; // ISO — when both sides went live, used for recency
  sides: [FeedDuelSide, FeedDuelSide];
  /** Which side to open on — the viewer's followed brand if there is one, otherwise brand A. */
  initialSideIndex: 0 | 1;
};

async function buildFeedDuels(viewerId: string | null): Promise<FeedDuel[]> {
  const allBattles = await getAllBattles();
  const eligible = allBattles.filter((battle) => {
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    const stage = getBattleStage({
      brandAId: battle.brandAId,
      brandBId: battle.brandBId,
      hasVideoA: Boolean(videoUrlA),
      hasVideoB: Boolean(videoUrlB),
      productionDeadline: battle.productionDeadline,
      votingEndsAt: battle.votingEndsAt,
    });
    // Only a battle where both real videos are visible belongs in the feed
    // — 'awaiting_videos' is still hidden, and a walkover/no_show never got
    // a second video to show at all.
    return stage.stage === "voting" || (stage.stage === "finished" && stage.resolution === "voted");
  });

  if (eligible.length === 0) return [];

  const battleIds = eligible.map((b) => b.id);
  const likeKeys = eligible.flatMap((b) => [
    { battleId: b.id, brandId: b.brandAId },
    { battleId: b.id, brandId: b.brandBId },
  ]);

  const [tallies, officialTallies, commentCounts, likeCounts, viewerLikedKeys, viewerVotes, viewerBrand, followedBrandIds] =
    await Promise.all([
      Promise.all(eligible.map((b) => getVoteTally(b.id, b.brandAId, b.brandBId))),
      // Phase 12: the frozen result at votingEndsAt — null for a battle
      // that's still in its voting window (nothing to freeze yet).
      Promise.all(
        eligible.map((b) =>
          b.votingEndsAt && b.votingEndsAt.getTime() < Date.now()
            ? getVoteTallyAsOf(b.id, b.brandAId, b.brandBId, b.votingEndsAt)
            : Promise.resolve(null),
        ),
      ),
      getCommentCounts(battleIds),
      getLikeCounts(likeKeys),
      viewerId ? getUserLikedKeys(viewerId, likeKeys) : Promise.resolve(new Set<string>()),
      viewerId ? Promise.all(eligible.map((b) => getUserVote(b.id, viewerId))) : Promise.resolve([]),
      viewerId ? getBrandForUser(viewerId) : Promise.resolve(null),
      viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
    ]);

  const talliesByBattle = new Map(eligible.map((b, i) => [b.id, tallies[i]]));
  const officialTalliesByBattle = new Map(eligible.map((b, i) => [b.id, officialTallies[i]]));
  const viewerVoteByBattle = new Map(eligible.map((b, i) => [b.id, viewerVotes[i] ?? null]));
  const followedSet = new Set(followedBrandIds);

  const duels: FeedDuel[] = [];
  for (const battle of eligible) {
    const { videoUrlA, videoUrlB } = resolveBattleVideos(battle);
    if (!videoUrlA || !videoUrlB) continue; // guaranteed by the eligibility filter, kept for type-narrowing
    const tally = talliesByBattle.get(battle.id)!;
    const officialTally = officialTalliesByBattle.get(battle.id) ?? null;
    // The winner is decided from the frozen result, not the live one —
    // votes cast after votingEndsAt count towards `tally` (shown as "the
    // current trend") but must never flip who officially won.
    const stage = getBattleStage(
      {
        brandAId: battle.brandAId,
        brandBId: battle.brandBId,
        hasVideoA: true,
        hasVideoB: true,
        productionDeadline: battle.productionDeadline,
        votingEndsAt: battle.votingEndsAt,
      },
      officialTally ?? tally,
    );
    const isFinished = stage.stage === "finished";
    if (isFinished && !battle.resultNotifiedAt) {
      // Fire-and-forget, scheduled to run after this response is sent
      // (next/server's after()) — see battle-notify.ts for why this piggy-
      // backs on ordinary feed reads instead of a cron job. Guarded by
      // resultNotifiedAt so this only actually does work once per battle.
      after(() => finalizeAndNotifyBattle(battle.id).catch((err) => console.error("[battle-notify]", err)));
    }
    const activatedAt = battle.votingEndsAt
      ? new Date(battle.votingEndsAt.getTime() - VOTING_WINDOW_MS)
      : battle.createdAt;
    const commentCount = commentCounts.get(battle.id) ?? 0;
    const viewerVotedBrandId = viewerVoteByBattle.get(battle.id) ?? null;
    const viewerOwnsThisBattle = Boolean(
      viewerBrand && (viewerBrand.id === battle.brandAId || viewerBrand.id === battle.brandBId),
    );

    const rawSides: [typeof battle.brandA, typeof battle.brandB] = [battle.brandA, battle.brandB];
    const videoUrls = [videoUrlA, videoUrlB];
    const sides = rawSides.map((brand, i): FeedDuelSide => {
      const key = `${battle.id}:${brand.id}`;
      return {
        brandId: brand.id,
        brandName: brand.name,
        brandSlug: brand.slug,
        brandLogoUrl: brand.logoUrl,
        videoUrl: videoUrls[i]!,
        likeCount: likeCounts.get(key) ?? 0,
        viewerLiked: viewerLikedKeys.has(key),
        viewerOwnsThisBrand: viewerBrand?.id === brand.id,
        viewerFollowsBrand: followedSet.has(brand.id),
      };
    }) as [FeedDuelSide, FeedDuelSide];

    const initialSideIndex: 0 | 1 = followedSet.has(sides[1].brandId) && !followedSet.has(sides[0].brandId) ? 1 : 0;

    duels.push({
      kind: "duel",
      key: battle.id,
      battleId: battle.id,
      category: battle.category,
      isFinished,
      votingEndsAt: battle.votingEndsAt ? battle.votingEndsAt.toISOString() : null,
      revealSplit: isFinished,
      tally,
      officialTally,
      commentCount,
      viewerVotedBrandId,
      viewerOwnsThisBattle,
      activatedAt: activatedAt.toISOString(),
      sides,
      initialSideIndex,
    });
  }
  return duels;
}

/**
 * Live-computed, not stored — same philosophy as effectiveStatus()/
 * getBattleStage(): recompute from current counts every time rather than
 * maintain a cached rank that can drift. Small platform, small dataset,
 * this is cheap; a future phase can cache it once that stops being true.
 */
function scoreFromEngagement(engagement: number, ageHours: number): number {
  // +1/+2 keep a brand-new, zero-engagement item from scoring exactly 0 (so
  // it still surfaces, just low) and from dividing by a near-zero age.
  return (engagement + 1) / Math.pow(ageHours + 2, 1.3);
}

// Phase 25: Feed-Personalisierung. A nudge, not an override — a followed
// brand's Duell scores higher than an identical unfollowed one, but a
// genuinely trending unfollowed Duell can still outrank a quiet followed
// one. Keeps "For You" one shared ranking algorithm rather than forking
// into a separate personalized-vs-generic feed (that's what "Folge ich"
// is already for, see getFollowingFeed below).
const FOLLOW_BOOST = 1.5;

function trendingScoreForDuel(duel: FeedDuel, followedBrandIds: Set<string>): number {
  const ageHours = Math.max(0, (Date.now() - new Date(duel.activatedAt).getTime()) / (60 * 60 * 1000));
  const totalLikes = duel.sides[0].likeCount + duel.sides[1].likeCount;
  const engagement = totalLikes * 1 + duel.commentCount * 1.5 + duel.tally.total * 2;
  const score = scoreFromEngagement(engagement, ageHours);
  const isFollowed = followedBrandIds.has(duel.sides[0].brandId) || followedBrandIds.has(duel.sides[1].brandId);
  return isFollowed ? score * FOLLOW_BOOST : score;
}

// Phase 13: a solo pitch — every video's starting point, watchable/likable/
// commentable with no opponent required (see CLAUDE-CODE-UEBERGABE.md §6).
// `reactionCount` links onward to the reactions sheet (best-liked first,
// src/lib/reaction.ts); posting a reaction or sending a formal "Pitch
// schicken" challenge both happen from there, not from feed data itself —
// keeping this shape cheap to build for a whole feed page.
export type FeedSoloPitch = {
  kind: "solo";
  key: string; // `solo:${soloPitchId}` — stable across re-fetches
  soloPitchId: string;
  category: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  videoUrl: string;
  likeCount: number;
  viewerLiked: boolean;
  viewerOwnsThisBrand: boolean;
  viewerFollowsBrand: boolean;
  commentCount: number;
  reactionCount: number;
  createdAt: string; // ISO
  /** Phase 26: an active, paid-for ranking bump — see boost.ts. Shown as a small badge to everyone, not just the owner. */
  boosted: boolean;
};

export type FeedItem = FeedDuel | FeedSoloPitch;

async function buildFeedSoloPitches(viewerId: string | null): Promise<FeedSoloPitch[]> {
  const pitches = await getAllSoloPitches();
  if (pitches.length === 0) return [];

  const ids = pitches.map((p) => p.id);
  const [likeCounts, commentCounts, reactionCounts, viewerLikedIds, viewerBrand, followedBrandIds, boostedIds] = await Promise.all([
    getSoloPitchLikeCounts(ids),
    getCommentCountsForSoloPitches(ids),
    getReactionCounts(ids),
    viewerId ? getUserLikedSoloPitchIds(viewerId, ids) : Promise.resolve(new Set<string>()),
    viewerId ? getBrandForUser(viewerId) : Promise.resolve(null),
    viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
    getActiveBoostedSoloPitchIds(ids),
  ]);
  const followedSet = new Set(followedBrandIds);

  return pitches.map((pitch): FeedSoloPitch => ({
    kind: "solo",
    key: `solo:${pitch.id}`,
    soloPitchId: pitch.id,
    category: pitch.category,
    brandId: pitch.brand.id,
    brandName: pitch.brand.name,
    brandSlug: pitch.brand.slug,
    brandLogoUrl: pitch.brand.logoUrl,
    videoUrl: pitch.videoUrl,
    likeCount: likeCounts.get(pitch.id) ?? 0,
    viewerLiked: viewerLikedIds.has(pitch.id),
    viewerOwnsThisBrand: viewerBrand?.id === pitch.brand.id,
    viewerFollowsBrand: followedSet.has(pitch.brand.id),
    commentCount: commentCounts.get(pitch.id) ?? 0,
    reactionCount: reactionCounts.get(pitch.id) ?? 0,
    createdAt: pitch.createdAt.toISOString(),
    boosted: boostedIds.has(pitch.id),
  }));
}

export type FeedPage = { items: FeedItem[]; total: number };

// Phase 21: a blended single trending score (see git history) quietly
// buried solo pitches — a Duell's vote count (weighted ×2, and
// accumulating over its whole week-long voting window) almost always
// outscores even a brand-new solo pitch, so "the feed IS the newest
// videos" stopped being true for solo content, contradicting the whole
// point of Solo-Pitch (§6 of CLAUDE-CODE-UEBERGABE.md: TikTok/Reels-style,
// newest posts first). Duels keep competing among themselves by trending
// score (that mechanic is fine on its own), but solo pitches are sorted
// purely by recency and then interleaved at a fixed cadence instead of
// competing on the same score — guarantees a fresh solo pitch actually
// surfaces instead of losing to an old, vote-heavy Duell.
const SOLO_INTERLEAVE_EVERY = 3;

function interleaveFeed(duels: FeedDuel[], soloPitchItems: FeedSoloPitch[], followedBrandIds: string[]): FeedItem[] {
  const followedSet = new Set(followedBrandIds);
  const rankedDuels = [...duels].sort((a, b) => trendingScoreForDuel(b, followedSet) - trendingScoreForDuel(a, followedSet));
  // Same "nudge, not override" idea as Duelle: a paid Boost (Phase 26) ranks
  // ahead of a followed brand's pitch, which ranks ahead of everything else
  // — but recency inside each bucket is untouched, so the Phase 21 "newest
  // first" guarantee for solo pitches still holds within any one bucket.
  const soloBucket = (p: FeedSoloPitch) => (p.boosted ? 0 : followedSet.has(p.brandId) ? 1 : 2);
  const freshSolos = [...soloPitchItems].sort((a, b) => {
    const bucketDiff = soloBucket(a) - soloBucket(b);
    if (bucketDiff !== 0) return bucketDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const merged: FeedItem[] = [];
  let duelIdx = 0;
  let soloIdx = 0;
  while (duelIdx < rankedDuels.length || soloIdx < freshSolos.length) {
    const nextIsSoloSlot = (merged.length + 1) % SOLO_INTERLEAVE_EVERY === 0;
    if (nextIsSoloSlot && soloIdx < freshSolos.length) {
      merged.push(freshSolos[soloIdx++]);
    } else if (duelIdx < rankedDuels.length) {
      merged.push(rankedDuels[duelIdx++]);
    } else {
      merged.push(freshSolos[soloIdx++]);
    }
  }
  return merged;
}

/** "Feed" — every live/finished Duell plus every solo pitch; solo pitches are interleaved by recency, see interleaveFeed. */
export async function getForYouFeed(viewerId: string | null, offset = 0, limit = 6): Promise<FeedPage> {
  const [duels, soloPitchItems, followedBrandIds] = await Promise.all([
    buildFeedDuels(viewerId),
    buildFeedSoloPitches(viewerId),
    viewerId ? getFollowedBrandIds(viewerId) : Promise.resolve([]),
  ]);
  const items = interleaveFeed(duels, soloPitchItems, followedBrandIds);
  return { items: items.slice(offset, offset + limit), total: items.length };
}

/**
 * One specific Duell by battleId, for deep-linking into the Feed (e.g. from
 * a notification, or a reminder that just went live) — reuses the same
 * eligibility rule as the rest of the feed, so it returns null for anything
 * not actually live/finished-and-voted yet.
 */
export async function getFeedDuelById(viewerId: string | null, battleId: string): Promise<FeedDuel | null> {
  const duels = await buildFeedDuels(viewerId);
  return duels.find((d) => d.battleId === battleId) ?? null;
}

/** Same deep-link purpose as getFeedDuelById, for a solo pitch's share link. */
export async function getFeedSoloPitchById(viewerId: string | null, soloPitchId: string): Promise<FeedSoloPitch | null> {
  const items = await buildFeedSoloPitches(viewerId);
  return items.find((p) => p.soloPitchId === soloPitchId) ?? null;
}

/** "Folge ich" — Duelle with a followed brand on either side, plus solo pitches from a followed brand, newest first. */
export async function getFollowingFeed(viewerId: string, offset = 0, limit = 6): Promise<FeedPage> {
  const followedBrandIds = await getFollowedBrandIds(viewerId);
  if (followedBrandIds.length === 0) return { items: [], total: 0 };
  const followedSet = new Set(followedBrandIds);

  const [duels, soloPitchItems] = await Promise.all([buildFeedDuels(viewerId), buildFeedSoloPitches(viewerId)]);
  const items: FeedItem[] = [
    ...duels.filter((duel) => followedSet.has(duel.sides[0].brandId) || followedSet.has(duel.sides[1].brandId)),
    ...soloPitchItems.filter((pitch) => followedSet.has(pitch.brandId)),
  ];
  const recencyOf = (item: FeedItem) => new Date(item.kind === "duel" ? item.activatedAt : item.createdAt).getTime();
  items.sort((a, b) => recencyOf(b) - recencyOf(a));
  return { items: items.slice(offset, offset + limit), total: items.length };
}
