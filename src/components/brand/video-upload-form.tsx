"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { uploadBrandVideo, type VideoFormState } from "@/app/actions/video";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function VideoUploadForm({ hasVideo }: { hasVideo: boolean }) {
  const [state, action] = useActionState<VideoFormState, FormData>(uploadBrandVideo, undefined);
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
      <FormError message={clientError ?? state?.errors?._form?.[0] ?? state?.errors?.video?.[0]} />
      {state?.success && <FormSuccess message="Video hochgeladen." />}
      <VideoPickerInput />
      <SubmitButton>{hasVideo ? "Video ersetzen" : "Video hochladen"}</SubmitButton>
    </form>
  );
}
