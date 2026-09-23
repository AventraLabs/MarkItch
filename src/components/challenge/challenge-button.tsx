"use client";

import { useActionState } from "react";
import { sendChallenge, type ChallengeFormState } from "@/app/actions/challenge";
import { FormError, SubmitButton } from "@/components/ui";

/** Phase 40: same label as PitchChallengeButton — one action, one name, everywhere. */
export function ChallengeButton({ challengedBrandId }: { challengedBrandId: string }) {
  const [state, action] = useActionState<ChallengeFormState, FormData>(sendChallenge, undefined);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="challengedBrandId" value={challengedBrandId} />
      <FormError message={state?.error} />
      <SubmitButton>Duell einladen</SubmitButton>
    </form>
  );
}
