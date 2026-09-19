"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { uploadBattleVideo, type UploadBattleVideoFormState } from "@/app/actions/battle";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";

export function BattleVideoUploadForm({ battleId }: { battleId: string }) {
  const [state, action] = useActionState<UploadBattleVideoFormState, FormData>(uploadBattleVideo, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
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
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="mt-4">
      <input type="hidden" name="battleId" value={battleId} />
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput />
      <CtaLinkFields ctaLabel={ctaLabel} ctaUrl={ctaUrl} onCtaLabelChange={setCtaLabel} onCtaUrlChange={setCtaUrl} />
      <SubmitButton>Dein Video hochladen</SubmitButton>
    </form>
  );
}
