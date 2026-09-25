"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { battles, challenges, soloPitches } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser, getBrandMemberUserIds } from "@/lib/brand";
import { CHALLENGE_WINDOW_MS, effectiveStatus, getLivePendingChallengeBetween } from "@/lib/challenge";
import { PITCH_CATEGORY, PRODUCTION_WINDOW_MS } from "@/lib/battle-format";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getActorLabel, notifyUsers } from "@/lib/notification";

export type ChallengeFormState = { error?: string } | undefined;

/** Brand A challenges Brand B. Triggered from B's public profile page. */
export async function sendChallenge(_prevState: ChallengeFormState, formData: FormData): Promise<ChallengeFormState> {
  const user = await requireUser();
  const challengedBrandId = formData.get("challengedBrandId");
  if (typeof challengedBrandId !== "string" || !challengedBrandId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um einzuladen." };
  }
  if (myBrand.id === challengedBrandId) {
    return { error: "Du kannst deine eigene Marke nicht einladen." };
  }

  const existing = await getLivePendingChallengeBetween(myBrand.id, challengedBrandId);
  if (existing) {
    return { error: "Zwischen euch läuft bereits eine offene Einladung." };
  }

  const { allowed } = await checkRateLimit("challenge", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  await db.insert(challenges).values({
    challengerBrandId: myBrand.id,
    challengedBrandId,
    status: "pending",
    expiresAt: new Date(Date.now() + CHALLENGE_WINDOW_MS),
  });

  await notifyChallenge(challengedBrandId, user.id);

  refresh();
  return undefined;
}

/**
 * Phase 43: challenger and challenged brand's members never heard anything
 * about an invitation at all — Luca: "die Info dass ich zum Duell
 * eingeladen habe kommt beim anderen nicht an". Shared by both send paths
 * (a plain profile challenge and "Pitch schicken" off a solo pitch).
 */
async function notifyChallenge(challengedBrandId: string, challengerUserId: string): Promise<void> {
  const [memberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challengedBrandId),
    getActorLabel(challengerUserId),
  ]);
  await notifyUsers(
    memberIds,
    `${actor.label} hat dich zu einem Duell herausgefordert.`,
    "/profile/settings#einladungen",
    challengerUserId,
  );
}

/**
 * Phase 13: "Pitch schicken" — a formal challenge sent straight off a solo
 * pitch, not from a brand profile. challengedBrandId is always that pitch's
 * own brand; on acceptance, respondToChallenge below prefills the
 * challenged side's video from the pitch itself, since it was already
 * public (see CLAUDE-CODE-UEBERGABE.md §6 — the old "verdeckt" fairness
 * rule doesn't apply here).
 */
export async function sendChallengeFromSoloPitch(
  _prevState: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const user = await requireUser();
  const soloPitchId = formData.get("soloPitchId");
  if (typeof soloPitchId !== "string" || !soloPitchId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du musst zuerst eine Marke erstellen, um einen Pitch zu schicken." };
  }

  const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, soloPitchId)).limit(1);
  if (!pitch) {
    return { error: "Dieser Pitch existiert nicht." };
  }
  if (pitch.brandId === myBrand.id) {
    return { error: "Du kannst deinen eigenen Pitch nicht herausfordern." };
  }

  const existing = await getLivePendingChallengeBetween(myBrand.id, pitch.brandId);
  if (existing) {
    return { error: "Zwischen euch läuft bereits eine offene Einladung." };
  }

  const { allowed } = await checkRateLimit("challenge", myBrand.id);
  if (!allowed) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  await db.insert(challenges).values({
    challengerBrandId: myBrand.id,
    challengedBrandId: pitch.brandId,
    soloPitchId: pitch.id,
    status: "pending",
    expiresAt: new Date(Date.now() + CHALLENGE_WINDOW_MS),
  });

  await notifyChallenge(pitch.brandId, user.id);

  refresh();
  return undefined;
}

export type CancelFormState = { error?: string } | undefined;

/** The challenger withdraws their own still-pending invitation. */
export async function cancelChallenge(_prevState: CancelFormState, formData: FormData): Promise<CancelFormState> {
  const user = await requireUser();
  const challengeId = formData.get("challengeId");
  if (typeof challengeId !== "string" || !challengeId) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du hast keine Marke." };
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge || challenge.challengerBrandId !== myBrand.id) {
    return { error: "Diese Einladung existiert nicht für deine Marke." };
  }
  if (effectiveStatus(challenge) !== "pending") {
    return { error: "Diese Einladung ist nicht mehr offen." };
  }

  await db
    .update(challenges)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  const [challengedMemberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challenge.challengedBrandId),
    getActorLabel(user.id),
  ]);
  await notifyUsers(challengedMemberIds, `${actor.label} hat die Duell-Einladung zurückgezogen.`, null, user.id);

  refresh();
  return undefined;
}

export type RespondFormState = { error?: string } | undefined;

/** The challenged brand accepts or declines. */
export async function respondToChallenge(_prevState: RespondFormState, formData: FormData): Promise<RespondFormState> {
  const user = await requireUser();
  const challengeId = formData.get("challengeId");
  const decision = formData.get("decision");
  if (typeof challengeId !== "string" || (decision !== "accept" && decision !== "decline")) {
    return { error: "Ungültige Anfrage." };
  }

  const myBrand = await getBrandForUser(user.id);
  if (!myBrand) {
    return { error: "Du hast keine Marke." };
  }

  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  if (!challenge || challenge.challengedBrandId !== myBrand.id) {
    return { error: "Diese Einladung existiert nicht für deine Marke." };
  }

  const status = effectiveStatus(challenge);
  if (status === "expired") {
    // Persist the expiry so it stops showing up as actionable.
    await db.update(challenges).set({ status: "expired" }).where(eq(challenges.id, challengeId));
    return { error: "Diese Einladung ist abgelaufen — das Zeitfenster ist vorbei." };
  }
  if (status !== "pending") {
    return { error: "Auf diese Einladung wurde bereits reagiert." };
  }

  await db
    .update(challenges)
    .set({ status: decision === "accept" ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  const [challengerMemberIds, actor] = await Promise.all([
    getBrandMemberUserIds(challenge.challengerBrandId),
    getActorLabel(user.id),
  ]);

  // Phase 7: accepting a challenge creates the battle row right away, but
  // it starts in "awaiting_videos" — no videos yet, nothing votable, nobody
  // notified. Both brands now have PRODUCTION_WINDOW_MS to each upload
  // their own video via uploadBattleVideo (src/app/actions/battle.ts),
  // which is also what flips it into "voting" and fires the "battle is
  // live" notification once both sides are in. Deliberately verdeckt: the
  // point is neither side can see (or react to) the other's video before
  // posting their own.
  //
  // Phase 13: unless this challenge came from "Pitch schicken" on a solo
  // pitch (challenge.soloPitchId set) — then the challenged brand's side is
  // already public, so it's prefilled at creation and only the challenger
  // (brandA) has to upload. uploadBattleVideo/activateBattleIfBothSidesReady
  // need no changes for this: a battle with one side already filled behaves
  // exactly like one where that side uploaded first, same as today.
  if (decision === "accept") {
    let prefilledBrandBVideo: { brandBVideoUrl: string; brandBSubmittedAt: Date } | Record<string, never> = {};
    if (challenge.soloPitchId) {
      const [pitch] = await db.select().from(soloPitches).where(eq(soloPitches.id, challenge.soloPitchId)).limit(1);
      if (pitch) {
        prefilledBrandBVideo = { brandBVideoUrl: pitch.videoUrl, brandBSubmittedAt: pitch.createdAt };
      }
    }
    const [battle] = await db
      .insert(battles)
      .values({
        challengeId: challenge.id,
        brandAId: challenge.challengerBrandId,
        brandBId: challenge.challengedBrandId,
        mode: "scheduled",
        category: PITCH_CATEGORY,
        productionDeadline: new Date(Date.now() + PRODUCTION_WINDOW_MS),
        ...prefilledBrandBVideo,
      })
      .returning({ id: battles.id });

    await notifyUsers(
      challengerMemberIds,
      `${actor.label} hat deine Duell-Einladung angenommen — jetzt dein Video hochladen!`,
      `/pitches/${battle.id}`,
      user.id,
    );
  } else {
    await notifyUsers(
      challengerMemberIds,
      `${actor.label} hat deine Duell-Einladung abgelehnt.`,
      "/profile/settings#einladungen",
      user.id,
    );
  }

  refresh();
  return undefined;
}
