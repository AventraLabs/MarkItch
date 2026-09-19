"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const [state, action] = useActionState<SubmitCastingFormState, FormData>(submitCastingEntry, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

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
    <form ref={formRef} action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="castingId" value={castingId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput />
      <SubmitButton>Video einreichen</SubmitButton>
    </form>
  );
}
