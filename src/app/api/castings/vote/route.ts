import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { castCastingVote, getCastingById } from "@/lib/casting";
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const castingId = body?.castingId;
  const submissionId = body?.submissionId;
  if (typeof castingId !== "string" || typeof submissionId !== "string" || !castingId || !submissionId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit("casting-vote", await getClientIp(request));
  if (!allowed) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const result = await castCastingVote(viewer.id, castingId, submissionId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const casting = await getCastingById(castingId, viewer.id);
  return NextResponse.json({ submissions: casting?.submissions ?? [], viewerVotedSubmissionId: submissionId });
}
