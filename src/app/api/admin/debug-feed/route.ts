import { NextRequest, NextResponse } from "next/server";
import { getForYouFeed } from "@/lib/feed";

// TEMPORARY, Phase 30 incident: "/" started 500ing in production right
// after this deploy, but the exact same code path returns 200 against a
// local build + locally-migrated DB — the crash must be data-shaped, not
// code-shaped, and there's no other way to see a real prod stack trace
// (no Vercel dashboard access here). Same shared-secret gate as
// /api/admin/migrate. Delete this route once the incident is diagnosed.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const expected = process.env.ADMIN_SEED_KEY;
  if (!expected || key !== expected) {
    return new NextResponse("Falscher oder fehlender Key.", { status: 403 });
  }

  try {
    const page = await getForYouFeed(null, 0, 6);
    return NextResponse.json({ ok: true, itemCount: page.items.length, total: page.total });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}
