"use client";

import { useActionState } from "react";
import { uploadBattleVideo, type UploadBattleVideoFormState } from "@/app/actions/battle";
import { FormError, SubmitButton } from "@/components/ui";
import { VideoPickerInput } from "@/components/video-picker-input";

export function BattleVideoUploadForm({ battleId }: { battleId: string }) {
  const [state, action] = useActionState<UploadBattleVideoFormState, FormData>(uploadBattleVideo, undefined);

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="battleId" value={battleId} />
      <FormError message={state?.error} />
      <VideoPickerInput />
      <SubmitButton>Dein Video hochladen</SubmitButton>
    </form>
  );
}
