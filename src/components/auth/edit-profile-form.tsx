"use client";

import { useActionState, useState } from "react";
import { updateProfile, type FormState } from "@/app/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "@/components/ui";

export function EditProfileForm({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, undefined);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const emailChanged = email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

  return (
    <form action={action}>
      <FormError message={state?.errors?._form?.[0]} />
      {state?.success && (
        <FormSuccess
          message={emailChanged ? "Gespeichert — bestätige deine neue E-Mail-Adresse, der Link wurde verschickt." : "Gespeichert."}
        />
      )}
      <Field label="Name" name="name" required={false} errors={state?.errors?.name} value={name} onChange={setName} />
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        errors={state?.errors?.email}
        value={email}
        onChange={setEmail}
      />
      {emailChanged && (
        <p className="mb-4 text-xs text-yellow-400">
          Du änderst deine E-Mail-Adresse — dein Account gilt danach wieder als nicht verifiziert, bis du den neuen
          Bestätigungslink anklickst.
        </p>
      )}
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}
