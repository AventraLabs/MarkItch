"use client";

import { useActionState, useEffect, useRef } from "react";
import { postReaction, type ReactionFormState } from "@/app/actions/reaction";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function ReactionUploadForm({ soloPitchId, onPosted }: { soloPitchId: string; onPosted: () => void }) {
  const [state, action, isPending] = useActionState<ReactionFormState, FormData>(postReaction, undefined);
  const wasPending = useRef(false);

  // postReaction returns `undefined` on success (same contract as
  // sendChallenge/counterWithVideo's non-error paths) — refresh() already
  // updates server-rendered data, but this sheet's reaction list is loaded
  // client-side, so the parent still needs telling to refetch it. Only fire
  // on an actual pending->done transition, not on mount (state also starts
  // out `undefined`).
  useEffect(() => {
    if (wasPending.current && !isPending && state === undefined) onPosted();
    wasPending.current = isPending;
  }, [isPending, state, onPosted]);

  return (
    <form action={action} className="rounded-xl border border-zinc-800 p-3">
      <input type="hidden" name="soloPitchId" value={soloPitchId} />
      <FormError message={state?.error} />
      <VideoPickerInput />
      <SubmitButton>Reaktion posten</SubmitButton>
    </form>
  );
}
