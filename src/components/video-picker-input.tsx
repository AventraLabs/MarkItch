"use client";

import { useRef, useState } from "react";

/**
 * Phase 22: every video upload form used a plain `<input type=file>`, which
 * on mobile just opens the OS picker (gallery vs. camera buried behind an
 * extra tap, varies by browser). Classic social apps put "film it now" and
 * "pick an existing file" side by side as the first thing you see — this
 * does the same with one hidden input and two buttons that toggle its
 * `capture` attribute before triggering it, so exactly one file ever ends
 * up in the form's `video` field regardless of which button was used.
 */
export function VideoPickerInput({ name = "video" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function open(useCamera: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (useCamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  return (
    <div className="mb-3">
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => open(true)}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-400 hover:text-orange-400"
        >
          🎥 Jetzt filmen
        </button>
        <button
          type="button"
          onClick={() => open(false)}
          className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-orange-400 hover:text-orange-400"
        >
          📁 Datei wählen
        </button>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">{fileName ?? "Keine Datei ausgewählt"}</p>
    </div>
  );
}
