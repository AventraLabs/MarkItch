"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Send } from "lucide-react";
import { sendChallengeFromSoloPitch, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";

/**
 * "Duell einladen" — direct invite off a solo pitch, see
 * CLAUDE-CODE-UEBERGABE.md §6. Same label/action everywhere a brand can be
 * invited to a duel (this button, ChallengeButton on a profile) — Phase 40:
 * previously called "Pitch schicken" here vs. "Einladen" on a profile,
 * two names for the same thing.
 *
 * Phase 41: sendChallenge doesn't redirect on success (unlike accepting one)
 * — the button just went back to its normal "Duell einladen" label once
 * the pending "…" cleared, indistinguishable from never having been
 * clicked. Luca: "lädt es oder wurde es versendet?" Now tracks the
 * pending→done transition itself and shows a real "Eingeladen ✓" state.
 */
export function PitchChallengeButton({ soloPitchId }: { soloPitchId: string }) {
  const [state, action, isPending] = useActionState<ChallengeFormState, FormData>(sendChallengeFromSoloPitch, undefined);
  const wasPending = useRef(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setSent(true);
    wasPending.current = isPending;
  }, [isPending, state]);

  if (sent) {
    return (
      <button type="button" disabled className="w-full rounded-lg bg-zinc-800 px-4 py-2 font-semibold text-zinc-400">
        <Check size={14} className="inline -mt-0.5 mr-1" /> Eingeladen
      </button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="soloPitchId" value={soloPitchId} />
      <FormError message={state?.error} />
      <SubmitButton>
        <Send size={14} className="inline -mt-0.5 mr-1" /> Duell einladen
      </SubmitButton>
    </form>
  );
}
