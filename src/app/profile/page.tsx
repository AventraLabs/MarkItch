import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { getFollowerCount, getFollowingCountForBrand } from "@/lib/follow";
import { getFeedSoloPitchesForBrand } from "@/lib/feed";
import { getProfileDuelTiles } from "@/lib/battle";
import { CreateBrandForm } from "@/components/brand/create-brand-form";
import { ProfileContentTabs } from "@/components/profile/profile-content-tabs";
import { BrandProfileHeader } from "@/components/profile/brand-profile-header";

/**
 * Phase 23: rebuilt to actually look like a profile tab (Instagram/TikTok
 * convention Luca asked for) — avatar, bio, follower/post counts, a grid
 * of what you've posted, and a gear icon into /profile/settings for
 * everything account-management-shaped (name/email, password, brand
 * video, casting status, invitations, legal). This page is the "what
 * anyone would see" view; settings is the "manage myself" view.
 */
export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);

  if (!user) {
    // Session refers to a user that no longer exists in the DB (e.g. a
    // stale session cookie outliving a deleted account) — send them
    // through a real sign-out instead of a silent blank page, so there's
    // an actual way out rather than a dead end.
    redirect("/api/auth/signout?callbackUrl=%2Flogin");
  }

  const brand = await getBrandForUser(sessionUser.id);
  const [mySoloPitches, myDuels, followerCount, followingCount] = await Promise.all([
    brand ? getFeedSoloPitchesForBrand(sessionUser.id, brand.id) : Promise.resolve([]),
    brand ? getProfileDuelTiles(brand.id) : Promise.resolve([]),
    brand ? getFollowerCount(brand.id) : Promise.resolve(0),
    brand ? getFollowingCountForBrand(brand.id) : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <Link href="/profile/settings" aria-label="Einstellungen" className="text-zinc-400 hover:text-white">
          <Settings size={24} strokeWidth={1.75} />
        </Link>
      </div>

      {brand ? (
        <>
          <BrandProfileHeader
            name={brand.name}
            logoUrl={brand.logoUrl}
            bio={brand.description}
            postCount={mySoloPitches.length + myDuels.length}
            followerCount={followerCount}
            followingCount={followingCount}
            followersHref={`/brands/${brand.slug}/followers`}
            followingHref={`/brands/${brand.slug}/following`}
          />

          {mySoloPitches.length + myDuels.length > 0 ? (
            <ProfileContentTabs soloPitches={mySoloPitches} duels={myDuels} isLoggedIn viewerBrandId={brand.id} />
          ) : (
            <div className="rounded-2xl border border-zinc-800 py-12 text-center">
              <p className="mb-2 text-sm text-zinc-500">Noch nichts gepostet.</p>
              <Link href="/post" className="text-sm font-semibold text-orange-500 hover:underline">
                + Jetzt posten
              </Link>
            </div>
          )}
        </>
      ) : user.accountType === "acro" ? (
        <div>
          <p className="mb-4 text-sm text-zinc-400">Leg zuerst deine Marke an, dann bekommst du ein eigenes Profil.</p>
          <CreateBrandForm />
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-500">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-3 text-lg font-semibold text-white">{user.name || user.email}</h2>
          <p className="mt-2 text-sm text-zinc-400">Als Assent schaust du zu, folgst und stimmst ab.</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/pitches" className="text-orange-500 hover:underline">
              Pitches ansehen →
            </Link>
            <Link href="/brands" className="text-orange-500 hover:underline">
              Marken entdecken →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
