import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Phase 32: shared by /profile (your own) and /brands/[slug] (anyone
 * else's) — Luca's report was that the two looked completely different,
 * the public one missing the real identity/post-count layout entirely
 * ("das öffentliche Profil ist falsch, sollte der aktuelle Profil sein").
 * One layout, parameterized by whatever action belongs in each context
 * (a settings gear for your own, a Follow button for anyone else's).
 *
 * Phase 35: Follower/Following counts are real links now — Luca: "ich habe
 * einen Follower aber kann nicht sehen wer... das gilt für alle Profile."
 */
export function BrandProfileHeader({
  name,
  logoUrl,
  bio,
  postCount,
  followerCount,
  followingCount,
  followersHref,
  followingHref,
  action,
}: {
  name: string;
  logoUrl: string | null;
  bio?: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  followersHref: string;
  followingHref: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
        <img src={logoUrl} alt={name} className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-500">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <h2 className="mt-3 text-xl font-bold text-white">{name}</h2>
      {bio && <p className="mt-1 max-w-xs text-sm text-zinc-400">{bio}</p>}
      <div className="mt-4 flex gap-8 text-sm">
        <div>
          <span className="font-bold text-white">{postCount}</span>{" "}
          <span className="text-zinc-500">{postCount === 1 ? "Post" : "Posts"}</span>
        </div>
        <Link href={followersHref} className="hover:opacity-80">
          <span className="font-bold text-white">{followerCount}</span> <span className="text-zinc-500">Follower</span>
        </Link>
        <Link href={followingHref} className="hover:opacity-80">
          <span className="font-bold text-white">{followingCount}</span> <span className="text-zinc-500">Folgt</span>
        </Link>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
