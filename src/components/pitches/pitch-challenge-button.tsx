"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { sendChallengeFromSoloPitch, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";

/**
 * "Duell einladen" — direct invite off a solo pitch, see
 * CLAUDE-CODE-UEBERGABE.md §6. Same label/action everywhere a brand can be
 * invited to a duel (this button, ChallengeButton on a profile) — Phase 40:
 * previously called "Pitch schicken" here vs. "Einladen" on a profile,
 * two names for the same thing.
 */
export function PitchChallengeButton({ soloPitchId }: { soloPitchId: string }) {
  const [state, action] = useActionState<ChallengeFormState, FormData>(sendChallengeFromSoloPitch, undefined);

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
