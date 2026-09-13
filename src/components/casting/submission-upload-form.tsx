"use client";

import { useActionState } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const [state, action] = useActionState<SubmitCastingFormState, FormData>(submitCastingEntry, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="castingId" value={castingId} />
      <FormError message={state?.error} />
      <input
        name="video"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        required
        className="mb-3 w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
      />
      <SubmitButton>Video einreichen</SubmitButton>
    </form>
  );
}
