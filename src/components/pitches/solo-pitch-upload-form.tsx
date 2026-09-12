"use client";

import { useActionState } from "react";
import { postSoloPitch, type SoloPitchFormState } from "@/app/actions/solo-pitch";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function SoloPitchUploadForm() {
  const [state, action] = useActionState<SoloPitchFormState, FormData>(postSoloPitch, undefined);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0] ?? state?.errors?.video?.[0]} />
      {state?.success && <FormSuccess message="Solo-Pitch gepostet — er läuft jetzt im Feed." />}
      <input
        id="solo-pitch-video"
        name="video"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        required
        className="mb-3 w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
      />
      <SubmitButton>Solo-Pitch posten</SubmitButton>
    </form>
  );
}
