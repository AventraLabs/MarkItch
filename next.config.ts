import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 12c: /api/admin/migrate reads the ./drizzle SQL files at runtime
  // (drizzle-orm's migrator). Next's serverless bundler only includes files
  // it can trace from actual require()/import calls, and raw .sql files
  // read via fs are invisible to that trace — without this they'd be
  // missing from the deployed function and every migration attempt would
  // fail with "no such file or directory" in production despite working
  // locally. See node_modules/next/dist/docs .../output.md.
  outputFileTracingIncludes: {
    "/api/admin/migrate": ["./drizzle/**/*"],
  },
  // Every video upload (Solo-Pitch, Duell-Video, Kontern, Reaktion, Casting-/
  // Creator-Einreichung) submits its File through a Server Action, and
  // Next's default Server Action body limit is 1MB — far under the app's
  // own 50MB video-size checks (MAX_VIDEO_BYTES in the relevant actions).
  // Without this, every real (non-trivially-small) video upload fails
  // before the action code ever runs — found 2026-09-19 when a real device
  // upload silently failed with a generic browser error, not one of this
  // app's own validation messages.
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
