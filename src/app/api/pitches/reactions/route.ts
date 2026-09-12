import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { getReactionsForSoloPitch } from "@/lib/reaction";

/** Reactions to a solo pitch, best-liked first — feeds the ReactionsSheet. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soloPitchId = searchParams.get("soloPitchId");
  if (!soloPitchId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const viewer = await getOptionalUser();
  const reactions = await getReactionsForSoloPitch(soloPitchId, viewer?.id ?? null);
  return NextResponse.json({ reactions });
}
