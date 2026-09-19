"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { postCreatorVideo, type PostCreatorVideoFormState } from "@/app/actions/creator-charts";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function CreatorVideoUploadForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, action] = useActionState<PostCreatorVideoFormState, FormData>(postCreatorVideo, undefined);
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
      <VideoPickerInput />
      <SubmitButton>Video posten</SubmitButton>
    </form>
  );
}
