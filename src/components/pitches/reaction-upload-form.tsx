"use client";

import { useActionState, useEffect, useRef } from "react";
import { postReaction, type ReactionFormState } from "@/app/actions/reaction";
import { FormError, SubmitButton } from "@/components/ui";

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
      <input
        name="video"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        required
        className="mb-2 w-full text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-700"
      />
      <SubmitButton>Reaktion posten</SubmitButton>
    </form>
  );
}
