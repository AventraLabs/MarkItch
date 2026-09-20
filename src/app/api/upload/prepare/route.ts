import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/session";
import { createVideoUploadTarget } from "@/lib/storage";
import { ALLOWED_VIDEO_TYPES, VIDEO_UPLOAD_FOLDERS, type VideoUploadFolder } from "@/lib/video-constants";

/**
 * Phase 29: step 1 of the direct-to-storage upload flow (see storage.ts's
 * comment on createVideoUploadTarget for why this exists at all). Returns
 * where the browser should PUT/POST the file bytes, and what the resulting
 * public URL will be — this route itself never sees the file.
 */
export async function POST(request: NextRequest) {
  const viewer = await getOptionalUser();
  if (!viewer) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const folder = body?.folder;
  const contentType = body?.contentType;

  if (typeof folder !== "string" || !VIDEO_UPLOAD_FOLDERS.includes(folder as VideoUploadFolder)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (typeof contentType !== "string" || !ALLOWED_VIDEO_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Erlaubt: MP4, WEBM oder MOV." }, { status: 400 });
  }

  try {
    const target = await createVideoUploadTarget(folder as VideoUploadFolder, contentType);
    return NextResponse.json(target);
  } catch (err) {
    console.error("[upload/prepare]", err);
    // TODO(debug, remove before merge): surfacing the real error to speed up
    // diagnosing the Supabase signed-URL call — behind auth already, no secrets in this message.
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload konnte nicht vorbereitet werden." }, { status: 500 });
  }
}
