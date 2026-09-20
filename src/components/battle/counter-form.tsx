"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { counterWithVideo, type CounterFormState } from "@/app/actions/battle";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";

export function CounterForm({ targetBrandId }: { targetBrandId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<CounterFormState, FormData>(counterWithVideo, undefined);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/10"
      >
        Antworten
      </button>
    );
  }

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
    <form action={action} onSubmit={handleSubmit} className="mt-4 rounded-lg border border-zinc-800 p-4">
      <input type="hidden" name="targetBrandId" value={targetBrandId} />
      <p className="mb-3 text-sm text-zinc-400">
        Lade dein eigenes Video hoch — sobald es hochgeladen ist, entsteht sofort ein Pitch und alle können
        abstimmen.
      </p>
      <FormError message={clientError ?? state?.error} />
      <VideoPickerInput
        folder="battle-videos"
        onUploadStateChange={({ uploading, uploadedUrl }) => {
          setVideoUploading(uploading);
          setVideoUploaded(Boolean(uploadedUrl));
        }}
      />
      <CtaLinkFields ctaLabel={ctaLabel} ctaUrl={ctaUrl} onCtaLabelChange={setCtaLabel} onCtaUrlChange={setCtaUrl} />
      <div className="flex gap-2">
        <SubmitButton>Antworten & Pitch starten</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
