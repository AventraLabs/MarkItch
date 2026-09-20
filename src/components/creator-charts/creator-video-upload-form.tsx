"use client";

import { useActionState, useState, type FormEvent } from "react";
import { postCreatorVideo, type PostCreatorVideoFormState } from "@/app/actions/creator-charts";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function CreatorVideoUploadForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, action] = useActionState<PostCreatorVideoFormState, FormData>(postCreatorVideo, undefined);
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
      <FormError message={clientError ?? state?.error} />
      {state?.success && <FormSuccess message="Video gepostet — läuft jetzt in den Creator-Charts dieser Marke." />}
      <select
        name="targetBrandId"
        required
        defaultValue=""
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
      >
        <option value="" disabled>
          Für welche Marke ist das Video?
        </option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <VideoPickerInput
        folder="creator-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <SubmitButton>Video posten</SubmitButton>
    </form>
  );
}
