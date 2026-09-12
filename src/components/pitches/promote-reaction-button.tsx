"use client";

import { useActionState } from "react";
import { promoteReaction, type PromoteReactionFormState } from "@/app/actions/reaction";
import { FormError, SubmitButton } from "@/components/ui";

/** "Hochstufen" — the original brand promotes a reaction straight to an official Duell. */
export function PromoteReactionButton({ reactionId }: { reactionId: string }) {
  const [state, action] = useActionState<PromoteReactionFormState, FormData>(promoteReaction, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="reactionId" value={reactionId} />
      <FormError message={state?.error} />
      <SubmitButton>⬆ Zum Duell hochstufen</SubmitButton>
    </form>
  );
}
