"use client";

import { useState } from "react";
import Link from "next/link";
import { SoloPitchUploadForm } from "@/components/pitches/solo-pitch-upload-form";
import { CreatorVideoUploadForm } from "@/components/creator-charts/creator-video-upload-form";
import { StartCastingForm } from "@/components/casting/start-casting-form";

type PostType = "solo" | "creator" | "casting";

const TYPES: { key: PostType; label: string; hint: string }[] = [
  { key: "solo", label: "Solo-Pitch", hint: "Ein normales Video, kein Gegner nötig." },
  { key: "creator", label: "Creator-Video", hint: "Video für eine Marke, mit der du zusammenarbeitest." },
  { key: "casting", label: "Partner-Casting", hint: "Ruf auf, einen neuen Markenpartner zu finden." },
];

export function PostTypePicker({
  otherBrands,
  activeCasting,
}: {
  otherBrands: { id: string; name: string }[];
  activeCasting: { id: string; prompt: string } | null;
}) {
  const [selected, setSelected] = useState<PostType>("solo");

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelected(t.key)}
            className={
              "rounded-lg border p-3 text-left transition-colors " +
              (selected === t.key ? "border-orange-500 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500")
            }
          >
            <p className={"text-sm font-semibold " + (selected === t.key ? "text-orange-400" : "text-white")}>{t.label}</p>
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-zinc-500">{TYPES.find((t) => t.key === selected)?.hint}</p>

      {selected === "solo" && <SoloPitchUploadForm />}
      {selected === "creator" &&
        (otherBrands.length > 0 ? (
          <CreatorVideoUploadForm brands={otherBrands} />
        ) : (
          <p className="text-sm text-zinc-500">Noch keine anderen Marken registriert.</p>
        ))}
      {selected === "casting" &&
        (activeCasting ? (
          <div className="rounded-lg border border-zinc-800 p-4 text-sm">
            <p className="mb-2 text-zinc-400">Du hast schon ein laufendes Casting:</p>
            <Link href={`/castings/${activeCasting.id}`} className="text-orange-400 hover:underline">
              „{activeCasting.prompt}“ ansehen →
            </Link>
          </div>
        ) : (
          <StartCastingForm />
        ))}
    </div>
  );
}
