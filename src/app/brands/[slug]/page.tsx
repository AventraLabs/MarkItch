import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import Link from "next/link";
import { VideoPlayer } from "@/components/brand/video-player";
import { ChallengeButton } from "@/components/challenge/challenge-button";
import { FollowButton } from "@/components/brand/follow-button";
import { CounterForm } from "@/components/battle/counter-form";
import { BrandProfileHeader } from "@/components/profile/brand-profile-header";
import { ProfileContentTabs } from "@/components/profile/profile-content-tabs";
import { getOptionalUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getLivePendingChallengeBetween } from "@/lib/challenge";
import { getFollowerCount, getFollowingCountForBrand, isFollowing } from "@/lib/follow";
import { getExistingOpenBattle, getProfileDuelTiles } from "@/lib/battle";
import { getActiveCastingForBrand, getLatestFinishedCastingForBrand } from "@/lib/casting";
import { currentPeriod, periodLabel, getChartForBrand } from "@/lib/creator-charts";
import { getFeedSoloPitchesForBrand } from "@/lib/feed";

// Note: this page already reads the session (getOptionalUser -> auth(),
// which touches cookies), so Next treats it as dynamic automatically —
// unlike /brands and /pitches, no explicit `dynamic = "force-dynamic"`
// is needed here.

const COUNTRY_LABELS: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  Other: "Andere",
};

export default async function BrandProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);

  if (!brand) notFound();

  const viewer = await getOptionalUser();
  const viewerBrand = viewer ? await getBrandForUser(viewer.id) : null;
  const isOwnBrand = viewerBrand?.id === brand.id;
  const [soloPitches, duels, livePending, followerCount, followingCount, viewerFollows, existingOpenBattle, activeCasting] =
    await Promise.all([
      getFeedSoloPitchesForBrand(viewer?.id ?? null, brand.id),
      getProfileDuelTiles(brand.id),
      viewerBrand && !isOwnBrand ? getLivePendingChallengeBetween(viewerBrand.id, brand.id) : null,
      getFollowerCount(brand.id),
      getFollowingCountForBrand(brand.id),
      viewer && !isOwnBrand ? isFollowing(viewer.id, brand.id) : false,
      viewerBrand && !isOwnBrand ? getExistingOpenBattle(brand.id, viewerBrand.id) : null,
      getActiveCastingForBrand(brand.id),
    ]);
  // Only bother looking up a finished casting's result if there's no
  // active one to show instead — a brand always has at most one relevant
  // casting to display at a time.
  const latestFinishedCasting = activeCasting ? null : await getLatestFinishedCastingForBrand(brand.id);
  const finishedStage = latestFinishedCasting?.stage;
  const winnerBrandId = finishedStage?.stage === "finished" ? finishedStage.winnerBrandId : null;
  const castingWinner = winnerBrandId
    ? latestFinishedCasting?.submissions.find((s) => s.brandId === winnerBrandId)
    : null;

  const period = currentPeriod();
  const { entries: chartEntries } = await getChartForBrand(brand.id, period, null);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      {/* Phase 32: identical layout to /profile (Luca: "das Profil bei jedem
          müsste so aussehen wie der Tab Profil") — this used to be a
          completely different, lesser page that never even showed this
          brand's actual posts. */}
      <BrandProfileHeader
        name={brand.name}
        logoUrl={brand.logoUrl}
        bio={brand.description}
        postCount={soloPitches.length + duels.length}
        followerCount={followerCount}
        followingCount={followingCount}
        followersHref={`/brands/${brand.slug}/followers`}
        followingHref={`/brands/${brand.slug}/following`}
        action={viewer && !isOwnBrand ? <FollowButton brandId={brand.id} isFollowing={viewerFollows} /> : undefined}
      />

      {soloPitches.length + duels.length > 0 ? (
        <ProfileContentTabs
          soloPitches={soloPitches}
          duels={duels}
          isLoggedIn={Boolean(viewer)}
          viewerBrandId={viewerBrand?.id ?? null}
        />
      ) : (
        <div className="rounded-2xl border border-zinc-800 py-12 text-center">
          <p className="text-sm text-zinc-500">Noch nichts gepostet.</p>
        </div>
      )}

      <div className="mt-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-medium text-orange-400">{brand.category}</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-medium text-zinc-400">
            {COUNTRY_LABELS[brand.country] ?? brand.country}
          </span>
        </div>

        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer" className="block text-sm text-orange-500 hover:underline">
            {brand.website} ↗
          </a>
        )}

        {brand.videoUrl && (
          <div>
            {/* Phase 35: labeled — Luca's report of an empty "Noch nichts
                gepostet" grid with an unexplained huge video right under it
                ("Stitchlab") was this legacy single-video field (predates
                solo pitches, Phase 13) rendering with no context at all. */}
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Vorstellungsvideo</p>
            <div className="mx-auto max-w-[280px]">
              <VideoPlayer src={brand.videoUrl} />
            </div>
          </div>
        )}

        {brand.videoUrl && viewerBrand && !isOwnBrand && (
          <div className="text-center">
            {existingOpenBattle ? (
              <Link href={`/pitches/${existingOpenBattle.id}`} className="text-sm text-orange-500 hover:underline">
                Du hast auf diese Marke bereits geantwortet — Pitch ansehen →
              </Link>
            ) : (
              <CounterForm targetBrandId={brand.id} />
            )}
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 p-4 text-center">
          <p className="mb-2 text-sm text-zinc-300">
            🎥 Creator-Charts — {periodLabel(period)}
            {chartEntries.length > 0 ? ` (${chartEntries.length})` : ""}
          </p>
          <Link
            href={`/brands/${brand.slug}/charts/${period}`}
            className="text-sm font-semibold text-orange-400 hover:underline"
          >
            {chartEntries.length > 0 ? "Ansehen & abstimmen" : "Noch keine Videos — erstes posten"} →
          </Link>
        </div>

        {activeCasting && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
            <p className="mb-2 text-sm text-orange-300">🎬 Partner-Casting läuft (neuer Partner gesucht): „{activeCasting.prompt}“</p>
            <Link href={`/castings/${activeCasting.id}`} className="text-sm font-semibold text-orange-400 hover:underline">
              {isOwnBrand ? "Ansehen" : "Ansehen & mitmachen"} →
            </Link>
          </div>
        )}

        {!activeCasting && castingWinner && latestFinishedCasting && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-center">
            <p className="text-sm text-orange-300">
              🏆 Offizieller Partner:{" "}
              <Link href={`/brands/${castingWinner.brandSlug}`} className="font-semibold hover:underline">
                {castingWinner.brandName}
              </Link>
            </p>
            <Link
              href={`/castings/${latestFinishedCasting.id}`}
              className="mt-1 inline-block text-xs text-orange-400/80 hover:underline"
            >
              Casting ansehen →
            </Link>
          </div>
        )}

        {viewerBrand && !isOwnBrand && (
          <>
            {livePending ? (
              <p className="text-center text-sm text-zinc-400">
                {livePending.challengerBrandId === viewerBrand.id
                  ? "Du hast diese Marke bereits eingeladen — Antwort steht noch aus."
                  : "Diese Marke hat dich bereits eingeladen — schau in deinem Profil vorbei."}
              </p>
            ) : (
              <ChallengeButton challengedBrandId={brand.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
