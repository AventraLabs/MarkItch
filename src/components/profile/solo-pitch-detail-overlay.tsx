"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  deleteSoloPitch,
  updateSoloPitch,
  type DeleteSoloPitchState,
  type UpdateSoloPitchFormState,
} from "@/app/actions/solo-pitch";
import { FormError, SubmitButton } from "@/components/ui";
import { CtaLinkFields } from "@/components/pitches/cta-link-fields";
import type { SoloPitch } from "@/db/schema";

/**
 * Phase 30: opened by clicking a tile in the profile's post grid — Luca's
 * report was that the grid showed videos but gave no real single-post view
 * (play/pause like Insta/TikTok, edit, delete). This is that view: the
 * video itself (tap to play/pause instead of native scrubber controls,
 * matching the feed's own convention), the caption, and owner-only
 * edit/delete. Never the video file itself — replacing it is a new post.
 */
export function SoloPitchDetailOverlay({
  pitch,
  onClose,
  onUpdated,
  onDeleted,
}: {
  pitch: SoloPitch;
  onClose: () => void;
  onUpdated: (patch: Partial<SoloPitch>) => void;
  onDeleted: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [description, setDescription] = useState(pitch.description ?? "");
  const [ctaLabel, setCtaLabel] = useState(pitch.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(pitch.ctaUrl ?? "");

  const [updateState, updateAction, updatePending] = useActionState<UpdateSoloPitchFormState, FormData>(
    updateSoloPitch,
    undefined,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<DeleteSoloPitchState, FormData>(
    deleteSoloPitch,
    undefined,
  );
  const wasUpdatePending = useRef(false);
  const wasDeletePending = useRef(false);

  // Same pending->done transition pattern as reaction-upload-form.tsx —
  // only fires on an actual completion, never on mount (both states start
  // out `undefined`, which also happens to be what a *successful* delete
  // returns).
  useEffect(() => {
    if (wasUpdatePending.current && !updatePending && updateState?.success) {
      onUpdated({ description, ctaLabel, ctaUrl });
      setEditing(false);
    }
    wasUpdatePending.current = updatePending;
  }, [updatePending, updateState, description, ctaLabel, ctaUrl, onUpdated]);

  useEffect(() => {
    if (wasDeletePending.current && !deletePending && deleteState === undefined) {
      onDeleted();
    }
    wasDeletePending.current = deletePending;
  }, [deletePending, deleteState, onDeleted]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[9/16] w-full bg-black">
          <video
            ref={videoRef}
            src={pitch.videoUrl}
            playsInline
            loop
            className="h-full w-full object-contain"
            onClick={togglePlay}
          />
          {!playing && (
            <button
              onClick={togglePlay}
              aria-label="Abspielen"
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-3xl text-white">
                ▶
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-lg text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-4">
          {editing ? (
            <form action={updateAction}>
              <input type="hidden" name="soloPitchId" value={pitch.id} />
              <FormError message={updateState?.errors?._form?.[0] ?? updateState?.errors?.description?.[0]} />
              <div className="mb-3">
                <label htmlFor={`description-${pitch.id}`} className="mb-1 block text-sm font-medium text-zinc-300">
                  Beschreibung
                </label>
                <textarea
                  id={`description-${pitch.id}`}
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-orange-500"
                />
              </div>
              <CtaLinkFields
                errors={updateState?.errors}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                onCtaLabelChange={setCtaLabel}
                onCtaUrlChange={setCtaUrl}
              />
              <div className="flex gap-2">
                <SubmitButton>Speichern</SubmitButton>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <>
              {pitch.description && <p className="mb-3 text-sm text-white">{pitch.description}</p>}
              {pitch.ctaUrl && pitch.ctaLabel && (
                <a
                  href={pitch.ctaUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
                >
                  {pitch.ctaLabel} →
                </a>
              )}
              <Link href={`/?pitch=${pitch.id}`} className="mb-3 block text-sm text-orange-500 hover:underline">
                Im Feed ansehen →
              </Link>

              {deleteState?.error && <FormError message={deleteState.error} />}

              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">Wirklich löschen?</span>
                  <form action={deleteAction}>
                    <input type="hidden" name="soloPitchId" value={pitch.id} />
                    <button
                      type="submit"
                      disabled={deletePending}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {deletePending ? "…" : "Ja, löschen"}
                    </button>
                  </form>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    Löschen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
