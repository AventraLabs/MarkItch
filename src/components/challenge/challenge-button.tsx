"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { sendChallenge, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";

/**
 * Phase 40: same label as PitchChallengeButton — one action, one name, everywhere.
 * Phase 41: see PitchChallengeButton's comment — a real "Eingeladen ✓" state
 * instead of the button just reverting to its normal label once pending
 * clears, with no way to tell whether it actually sent.
 */
export function ChallengeButton({ challengedBrandId }: { challengedBrandId: string }) {
  const [state, action, isPending] = useActionState<ChallengeFormState, FormData>(sendChallenge, undefined);
  const wasPending = useRef(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) setSent(true);
    wasPending.current = isPending;
  }, [isPending, state]);

  if (sent) {
    return (
      <button type="button" disabled className="mt-6 w-full rounded-lg bg-zinc-800 px-4 py-2 font-semibold text-zinc-400">
        <Check size={14} className="inline -mt-0.5 mr-1" /> Eingeladen
      </button>
    );
  }

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="challengedBrandId" value={challengedBrandId} />
      <FormError message={state?.error} />
      <SubmitButton>Duell einladen</SubmitButton>
    </form>
  );
}
