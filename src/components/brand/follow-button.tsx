"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toggleFollow, type FollowFormState } from "@/app/actions/follow";

function ToggleButton({ following }: { following: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 " +
        (following
          ? "border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-400"
          : "bg-orange-600 text-white hover:bg-orange-500")
      }
    >
      {pending ? "…" : following ? "Folgt ✓" : "Folgen"}
    </button>
  );
}

export function FollowButton({ brandId, isFollowing }: { brandId: string; isFollowing: boolean }) {
  const [state, action, isPending] = useActionState<FollowFormState, FormData>(toggleFollow, undefined);
  // Phase 43: the label used to wait on the whole page's server-triggered
  // refresh to reflect the new state — Luca: "im Profil wenn ich klicke
  // sind nur die drei Punkte", on a page whose data reload is slow that
  // could sit stuck well past when the click itself actually succeeded.
  // Flip locally the instant the action resolves instead, same fix as
  // ChallengeButton/PitchChallengeButton.
  const [following, setFollowing] = useState(isFollowing);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setFollowing((f) => !f);
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form action={action}>
      <input type="hidden" name="brandId" value={brandId} />
      <ToggleButton following={following} />
      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
