"use client";

import { useActionState, useState, type FormEvent } from "react";
import { submitCastingEntry, type SubmitCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function SubmissionUploadForm({ castingId }: { castingId: string }) {
  const [state, action] = useActionState<SubmitCastingFormState, FormData>(submitCastingEntry, undefined);
  const [clientError, setClientError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  // Phase 29: the video is already uploaded (directly to storage, see
  // video-picker-input.tsx) by the time this fires.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (videoUploading) {
      e.preventDefault();
      setClientError("Video wird noch hochgeladen — kurz warten.");
      return;
    }
    if (!videoUploaded) {
      e.preventDefault();
      setClientError("Bitte zuerst ein Video auswählen.");
      return;
    }
    setClientError(null);
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="castingId" value={castingId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput
        folder="casting-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <SubmitButton>Video einreichen</SubmitButton>
    </form>
  );
}
