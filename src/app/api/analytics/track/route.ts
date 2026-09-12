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
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const brandId = body?.brandId;
  const kind = body?.kind;
  if (typeof brandId !== "string" || !brandId || (kind !== "view" && kind !== "share")) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  await recordAnalyticsEvent(brandId, kind as AnalyticsEventKind);
  return NextResponse.json({ ok: true });
}
