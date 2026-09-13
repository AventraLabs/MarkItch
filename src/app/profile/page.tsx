import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { LogoutButton } from "@/components/auth/logout-button";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { CreateBrandForm } from "@/components/brand/create-brand-form";
import { VideoUploadForm } from "@/components/brand/video-upload-form";
import { VideoPlayer } from "@/components/brand/video-player";
import { IncomingChallengeList, OutgoingChallengeList } from "@/components/challenge/challenge-list";
import { getIncomingChallenges, getOutgoingChallenges } from "@/lib/challenge";
import { getUnreadNotificationCount } from "@/lib/notification";
import { getSoloPitchesForBrand } from "@/lib/solo-pitch";
import { getActiveCastingForBrand, getWonCastingsForBrand } from "@/lib/casting";

// This page reads challenges, notifications etc. below via requireUser()
// -> auth() (cookies), so it's already dynamic — no explicit flag needed.

/**
 * Phase 21: this page went on a diet — it used to also carry three upload
 * forms (Solo-Pitch, Creator-Video, Partner-Casting-start), which doesn't
 * match how a profile page works anywhere else (bio + what you've posted,
 * not where you post from) — see the new "+" tab / src/app/post/page.tsx
 * for where those moved. What's left here is identity (your account, your
 * brand) and status (what's running, what you've won/sent/received) —
 * displays and links, not creation forms, with one deliberate exception:
 * CreateBrandForm stays, since setting up your brand identity is itself an
 * identity action, not "a post".
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
  const [incomingChallenges, outgoingChallenges, unreadCount, mySoloPitches, activeCasting, wonCastings] = await Promise.all([
    brand ? getIncomingChallenges(brand.id) : Promise.resolve([]),
    brand ? getOutgoingChallenges(brand.id) : Promise.resolve([]),
    getUnreadNotificationCount(sessionUser.id),
    brand ? getSoloPitchesForBrand(brand.id) : Promise.resolve([]),
    brand ? getActiveCastingForBrand(brand.id) : Promise.resolve(null),
    brand ? getWonCastingsForBrand(brand.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <LogoutButton />
      </div>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-400">Name</dt>
            <dd className="text-white">{user.name || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">E-Mail</dt>
            <dd className="text-white">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">Rolle</dt>
            <dd>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
                {user.accountType === "acro" ? "Acro" : "Assent"}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">Status</dt>
            <dd>
              {user.emailVerifiedAt ? (
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                  ✓ Verifiziert
                </span>
              ) : (
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                  Nicht verifiziert
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">Mitglied seit</dt>
            <dd className="text-white">{user.createdAt.toLocaleDateString("de-AT")}</dd>
          </div>
        </dl>

        {!user.emailVerifiedAt && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <ResendVerificationButton />
          </div>
        )}
      </div>

      <Link
        href="/notifications"
        className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-600"
      >
        <span className="text-lg font-semibold text-white">🔔 Benachrichtigungen</span>
        <span className="text-sm text-orange-400">
          {unreadCount > 0 ? `${unreadCount} ungelesen →` : "Ansehen →"}
        </span>
      </Link>

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Meine Marke</h2>
        {brand ? (
          <div className="flex items-center gap-4">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary source
              <img src={brand.logoUrl} alt={brand.name} className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-800 text-xl font-bold text-zinc-500">
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-white">{brand.name}</p>
              <div className="flex gap-3">
                <Link href={`/brands/${brand.slug}`} className="text-sm text-orange-500 hover:underline">
                  Profil ansehen
                </Link>
                <Link href="/dashboard" className="text-sm text-orange-500 hover:underline">
                  Dashboard →
                </Link>
              </div>
            </div>
          </div>
        ) : user.accountType === "acro" ? (
          <CreateBrandForm />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>Als Assent hast du keine eigene Marke — du schaust zu, folgst und stimmst ab.</p>
            <div className="mt-3 flex gap-4">
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

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Video</h2>
          {brand.videoUrl && (
            <div className="mb-4 max-w-[200px]">
              <VideoPlayer src={brand.videoUrl} />
            </div>
          )}
          <VideoUploadForm hasVideo={Boolean(brand.videoUrl)} />
        </div>
      )}

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Meine Solo-Pitches</h2>
            <Link href="/post" className="text-sm text-orange-500 hover:underline">
              + Neu posten
            </Link>
          </div>
          {mySoloPitches.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {mySoloPitches.map((pitch) => (
                <li key={pitch.id}>
                  <VideoPlayer src={pitch.videoUrl} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Noch nichts gepostet.</p>
          )}
        </div>
      )}

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Partner-Casting</h2>
          {wonCastings.length > 0 && (
            <p className="mb-3 text-sm text-orange-400">
              🏆 {brand.name} ist offizieller Partner bei {wonCastings.length} {wonCastings.length === 1 ? "Casting" : "Castings"}.
            </p>
          )}
          {activeCasting ? (
            <Link href={`/castings/${activeCasting.id}`} className="text-sm text-orange-500 hover:underline">
              Läuft: „{activeCasting.prompt}“ ansehen →
            </Link>
          ) : (
            <Link href="/post" className="text-sm text-orange-500 hover:underline">
              + Neues Casting starten
            </Link>
          )}
        </div>
      )}

      {brand && (
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Einladungen</h2>
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Eingehend</h3>
            <IncomingChallengeList challenges={incomingChallenges} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Gesendet</h3>
            <OutgoingChallengeList challenges={outgoingChallenges} />
          </div>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Passwort ändern</h2>
        <ChangePasswordForm />
      </div>

      <div className="flex justify-center gap-4 pb-4 text-xs text-zinc-600">
        <Link href="/impressum" className="hover:text-zinc-400">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-zinc-400">
          Datenschutz
        </Link>
        <Link href="/nutzungsbedingungen" className="hover:text-zinc-400">
          Nutzungsbedingungen
        </Link>
      </div>
    </div>
  );
}
