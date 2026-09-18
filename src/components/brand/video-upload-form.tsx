"use client";

import { useActionState } from "react";
import { uploadBrandVideo, type VideoFormState } from "@/app/actions/video";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function VideoUploadForm({ hasVideo }: { hasVideo: boolean }) {
  const [state, action] = useActionState<VideoFormState, FormData>(uploadBrandVideo, undefined);

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0] ?? state?.errors?.video?.[0]} />
      {state?.success && <FormSuccess message="Video hochgeladen." />}
      <VideoPickerInput />
      <SubmitButton>{hasVideo ? "Video ersetzen" : "Video hochladen"}</SubmitButton>
    </form>
  );
}
