"use client";

import { useActionState, useState, type FormEvent } from "react";
import { uploadBrandVideo, type VideoFormState } from "@/app/actions/video";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function VideoUploadForm({ hasVideo }: { hasVideo: boolean }) {
  const [state, action] = useActionState<VideoFormState, FormData>(uploadBrandVideo, undefined);
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
      <FormError message={clientError ?? state?.errors?._form?.[0] ?? state?.errors?.video?.[0]} />
      {state?.success && <FormSuccess message="Video hochgeladen." />}
      <VideoPickerInput
        folder="videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <SubmitButton>{hasVideo ? "Video ersetzen" : "Video hochladen"}</SubmitButton>
    </form>
  );
}
