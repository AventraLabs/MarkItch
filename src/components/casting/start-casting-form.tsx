"use client";

import { useActionState } from "react";
import { startCasting, type StartCastingFormState } from "@/app/actions/casting";
import { FormError, SubmitButton } from "@/components/ui";

export function StartCastingForm() {
  const [state, action] = useActionState<StartCastingFormState, FormData>(startCasting, undefined);

  return (
    <form action={action}>
      <FormError message={state?.error} />
      <textarea
        name="prompt"
        required
        maxLength={200}
        rows={2}
        placeholder="Wen suchst du? Z.B. „Wer wird unser nächster Markenpartner?“"
        className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500"
      />
      <SubmitButton>Partner-Casting starten</SubmitButton>
    </form>
  );
}
