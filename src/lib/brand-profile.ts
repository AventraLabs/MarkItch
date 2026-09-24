import "server-only";
import { getActiveCastingForBrand, getLatestFinishedCastingForBrand } from "@/lib/casting";
import { currentPeriod, periodLabel, getChartForBrand } from "@/lib/creator-charts";
import { getLivePendingChallengeBetween } from "@/lib/challenge";
import type { PartnerCasting } from "@/db/schema";
import type { CreatorChartEntry } from "@/lib/creator-charts";

export type BrandProfileExtras = {
  category: string;
  country: string;
  website: string | null;
  period: string;
  periodLabel: string;
  chartEntries: CreatorChartEntry[];
  activeCasting: PartnerCasting | null;
  castingWinner: { brandName: string; brandSlug: string } | null;
  latestFinishedCastingId: string | null;
  livePending: Awaited<ReturnType<typeof getLivePendingChallengeBetween>>;
};

/**
 * Phase 41: `/profile` (the tab) and `/brands/[slug]` (what a name-click
 * opens) used to each fetch this "everything below the video grid" section
 * separately — they'd already drifted apart once (Phase 32) and did again
 * (`/profile` was quietly missing category/website/Creator-Charts/
 * Partner-Casting entirely). Luca: "der Screen auf Tab Profil muss der
 * selbe sein wie der Screen wenn jemand auf meinen Namen klickt,
 * logischerweise." One shared loader instead of two copies that can drift.
 */
export async function getBrandProfileExtras(
  brand: { id: string; slug: string; category: string; country: string; website: string | null },
  viewerBrandId: string | null,
  isOwnBrand: boolean,
): Promise<BrandProfileExtras> {
  const period = currentPeriod();
  // Phase 42: getChartForBrand doesn't depend on anything below — it was
  // previously awaited on its own afterwards, adding a needless extra
  // round trip to an already request-waterfall-heavy page.
  const [activeCasting, livePending, { entries: chartEntries }] = await Promise.all([
    getActiveCastingForBrand(brand.id),
    viewerBrandId && !isOwnBrand ? getLivePendingChallengeBetween(viewerBrandId, brand.id) : Promise.resolve(null),
    getChartForBrand(brand.id, period, null),
  ]);
  // Only bother looking up a finished casting's result if there's no
  // active one to show instead — a brand always has at most one relevant
  // casting to display at a time.
  const latestFinishedCasting = activeCasting ? null : await getLatestFinishedCastingForBrand(brand.id);
  const finishedStage = latestFinishedCasting?.stage;
  const winnerBrandId = finishedStage?.stage === "finished" ? finishedStage.winnerBrandId : null;
  const castingWinnerSubmission = winnerBrandId
    ? latestFinishedCasting?.submissions.find((s) => s.brandId === winnerBrandId)
    : null;

  return {
    category: brand.category,
    country: brand.country,
    website: brand.website,
    period,
    periodLabel: periodLabel(period),
    chartEntries,
    activeCasting,
    castingWinner: castingWinnerSubmission
      ? { brandName: castingWinnerSubmission.brandName, brandSlug: castingWinnerSubmission.brandSlug }
      : null,
    latestFinishedCastingId: latestFinishedCasting?.id ?? null,
    livePending,
  };
}
