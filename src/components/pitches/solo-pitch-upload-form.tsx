"use client";

import { useActionState } from "react";
import { postSoloPitch, type SoloPitchFormState } from "@/app/actions/solo-pitch";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function SoloPitchUploadForm() {
  const [state, action] = useActionState<SoloPitchFormState, FormData>(postSoloPitch, undefined);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0] ?? state?.errors?.video?.[0]} />
      {state?.success && <FormSuccess message="Solo-Pitch gepostet — er läuft jetzt im Feed." />}
      <VideoPickerInput />
      <SubmitButton>Solo-Pitch posten</SubmitButton>
    </form>
  );
}
