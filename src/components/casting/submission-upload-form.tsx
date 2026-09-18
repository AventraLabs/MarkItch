"use client";

import { useActionState } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const [state, action] = useActionState<SubmitCastingFormState, FormData>(submitCastingEntry, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="castingId" value={castingId} />
      <FormError message={state?.error} />
      <VideoPickerInput />
      <SubmitButton>Video einreichen</SubmitButton>
    </form>
  );
}
