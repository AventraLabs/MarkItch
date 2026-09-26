import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { recordAnalyticsEvent, type AnalyticsEventKind } from "@/lib/analytics";

/**
 * View/share tracking — deliberately open to anyone, logged-in or not (a
 * view happens just by scrolling past a video, no account needed). Low
 * stakes if gamed (a few inflated view counts, not a vote or a Duell
 * outcome), so unlike vote/register this isn't rate-limited — see
 * src/lib/rate-limit.ts's bucket list for what actually needs it.
 */
const VALID_KINDS: AnalyticsEventKind[] = ["view", "share", "cta_click", "vote_click", "login_required"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const brandId = body?.brandId;
  const kind = body?.kind;
  const soloPitchId = typeof body?.soloPitchId === "string" ? body.soloPitchId : undefined;
  const battleId = typeof body?.battleId === "string" ? body.battleId : undefined;
  const anonId = typeof body?.anonId === "string" && body.anonId ? body.anonId : undefined;
  if (typeof brandId !== "string" || !brandId || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await recordAnalyticsEvent(brandId, kind as AnalyticsEventKind, { soloPitchId, battleId, anonId });
  return NextResponse.json({ ok: true });
}
