"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { postReaction, type ReactionFormState } from "@/app/actions/reaction";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function ReactionUploadForm({ soloPitchId, onPosted }: { soloPitchId: string; onPosted: () => void }) {
  const [state, action, isPending] = useActionState<ReactionFormState, FormData>(postReaction, undefined);
  const wasPending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

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

  // Phase 27.1: catch "kein Video" before the action fires — a file input
  // can never be refilled after a server round trip, see solo-pitch-upload-form.tsx.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const video = formRef.current?.elements.namedItem("video") as HTMLInputElement | null;
    if (!video?.files?.length) {
      e.preventDefault();
      setClientError("Bitte zuerst ein Video auswählen.");
      return;
    }
    setClientError(null);
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 p-3">
      <input type="hidden" name="soloPitchId" value={soloPitchId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput />
      <SubmitButton>Reaktion posten</SubmitButton>
    </form>
  );
}
