"use client";

import { useActionState } from "react";
import { Swords } from "lucide-react";
import { sendChallengeFromSoloPitch, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";

/** "Pitch schicken" — direct challenge off a solo pitch, see CLAUDE-CODE-UEBERGABE.md §6. */
export function PitchChallengeButton({ soloPitchId }: { soloPitchId: string }) {
  const [state, action] = useActionState<ChallengeFormState, FormData>(sendChallengeFromSoloPitch, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="soloPitchId" value={soloPitchId} />
      <FormError message={state?.error} />
      <SubmitButton>
        <Swords size={14} className="inline -mt-0.5 mr-1" /> Pitch schicken
      </SubmitButton>
    </form>
  );
}
