"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { postSoloPitch, type SoloPitchFormState } from "@/app/actions/solo-pitch";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";

export function SoloPitchUploadForm() {
  const [state, action] = useActionState<SoloPitchFormState, FormData>(postSoloPitch, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  // Phase 27.1: a file input can never be refilled by React after a server
  // round trip (browsers won't allow it, for security) — so "kein Video
  // ausgewählt" has to be caught here, before the action ever fires, or the
  // whole form (video AND the text fields below) resets for nothing.
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
      {state?.success && <FormSuccess message="Solo-Pitch gepostet — er läuft jetzt im Feed." />}
      <VideoPickerInput />
      <CtaLinkFields
        errors={state?.errors}
        ctaLabel={ctaLabel}
        ctaUrl={ctaUrl}
        onCtaLabelChange={setCtaLabel}
        onCtaUrlChange={setCtaUrl}
      />
      <SubmitButton>Solo-Pitch posten</SubmitButton>
    </form>
  );
}
