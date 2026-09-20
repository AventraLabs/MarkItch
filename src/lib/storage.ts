import "server-only";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { VIDEO_EXTENSION_BY_MIME_TYPE, type VideoUploadFolder } from "@/lib/video-constants";

// Local disk in dev (zero setup), Supabase Storage in prod once configured.
// Vercel's filesystem is ephemeral/read-only outside /tmp, so the local
// adapter is dev-only — see README for the Supabase Storage setup.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "public-media";

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSION_BY_MIME_TYPE);

export function uploadImage(file: File, folder: string): Promise<{ url: string }> {
  return uploadFile(file, folder, IMAGE_EXTENSION_BY_MIME_TYPE);
}

async function uploadFile(
  file: File,
  folder: string,
  extensionByMimeType: Record<string, string>,
): Promise<{ url: string }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extensionByMimeType[file.type] ?? "bin";
  const key = `${folder}/${randomUUID()}.${extension}`;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return uploadToSupabase(key, bytes, file.type);
  }
  return uploadToLocalDisk(key, bytes);
}

async function uploadToLocalDisk(key: string, bytes: Buffer): Promise<{ url: string }> {
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return { url: `/uploads/${key}` };
}

async function uploadToSupabase(key: string, bytes: Buffer, contentType: string): Promise<{ url: string }> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage upload failed: ${res.status} ${await res.text()}`);
  }
  return { url: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${key}` };
}

// Phase 29: video uploads no longer flow through a Server Action at all —
// Vercel's Serverless Functions cap a request body at 4.5 MB, hard, not
// configurable via next.config.ts (that only raises *Next's own* default,
// which is a much smaller 1 MB — see the Phase 28 fix — but Vercel's
// platform limit sits underneath it regardless, and any real video clip
// (even a few seconds) is bigger than 4.5 MB). The fix: the browser uploads
// the file bytes directly to storage — Supabase Storage in prod via a
// signed upload URL, or a plain local-disk relay route in dev — and only
// the resulting URL (a few bytes) ever goes through a Server Action.
export type VideoUploadTarget = { uploadUrl: string; publicUrl: string };

export async function createVideoUploadTarget(folder: VideoUploadFolder, contentType: string): Promise<VideoUploadTarget> {
  const extension = VIDEO_EXTENSION_BY_MIME_TYPE[contentType] ?? "bin";
  const key = `${folder}/${randomUUID()}.${extension}`;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${SUPABASE_BUCKET}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Supabase signed-upload-URL request failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { url: string };
    return {
      uploadUrl: `${SUPABASE_URL}/storage/v1${data.url}`,
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${key}`,
    };
  }

  return {
    uploadUrl: `/api/upload/local-relay?key=${encodeURIComponent(key)}`,
    publicUrl: `/uploads/${key}`,
  };
}

/** Every server action that accepts a client-supplied videoUrl checks this before trusting it — rejects an arbitrary external URL. */
export function isOwnVideoUrl(url: string, folder: VideoUploadFolder): boolean {
  if (url.startsWith(`/uploads/${folder}/`)) return true;
  if (SUPABASE_URL && url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${folder}/`)) return true;
  return false;
}

/** Every video-upload action's first step now — reads the client-uploaded videoUrl instead of a File, still refusing anything that isn't actually ours. */
export function readVideoUrlField(
  formData: FormData,
  folder: VideoUploadFolder,
  fieldName = "videoUrl",
): { videoUrl: string } | { error: string } {
  const raw = formData.get(fieldName);
  if (typeof raw !== "string" || !raw) return { error: "Bitte ein Video auswählen." };
  if (!isOwnVideoUrl(raw, folder)) return { error: "Ungültige Video-URL." };
  return { videoUrl: raw };
}

/** Used only by the local-disk relay route (dev, no Supabase configured) — writes bytes Supabase would otherwise have received. */
export async function writeLocalUpload(key: string, bytes: Buffer): Promise<void> {
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}
