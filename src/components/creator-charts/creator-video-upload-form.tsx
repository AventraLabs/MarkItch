"use client";

import { useActionState } from "react";
import { postCreatorVideo, type PostCreatorVideoFormState } from "@/app/actions/creator-charts";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function CreatorVideoUploadForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [state, action] = useActionState<PostCreatorVideoFormState, FormData>(postCreatorVideo, undefined);

  return (
    <form action={action}>
      <FormError message={state?.error} />
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
      <input
        name="video"
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        required
        className="mb-3 w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
      />
      <SubmitButton>Video posten</SubmitButton>
    </form>
  );
}
