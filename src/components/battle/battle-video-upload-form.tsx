"use client";

import { useActionState, useState, type FormEvent } from "react";
import { uploadBattleVideo, type UploadBattleVideoFormState } from "@/app/actions/battle";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";

export function BattleVideoUploadForm({ battleId }: { battleId: string }) {
  const [state, action] = useActionState<UploadBattleVideoFormState, FormData>(uploadBattleVideo, undefined);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
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
    <form action={action} onSubmit={handleSubmit} className="mt-4">
      <input type="hidden" name="battleId" value={battleId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput
        folder="battle-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <CtaLinkFields ctaLabel={ctaLabel} ctaUrl={ctaUrl} onCtaLabelChange={setCtaLabel} onCtaUrlChange={setCtaUrl} />
      <SubmitButton>Dein Video hochladen</SubmitButton>
    </form>
  );
}
