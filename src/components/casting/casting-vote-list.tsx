"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CastingSubmissionWithBrand } from "@/lib/casting";

export function CastingVoteList({
  castingId,
  initialSubmissions,
  initialViewerVotedSubmissionId,
  isLoggedIn,
  canVote,
  winnerBrandId,
}: {
  castingId: string;
  initialSubmissions: CastingSubmissionWithBrand[];
  initialViewerVotedSubmissionId: string | null;
  isLoggedIn: boolean;
  canVote: boolean;
  winnerBrandId: string | null;
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [votedId, setVotedId] = useState(initialViewerVotedSubmissionId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVote(submissionId: string) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setPendingId(submissionId);
    setError(null);
    try {
      const res = await fetch("/api/castings/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castingId, submissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Abstimmen fehlgeschlagen.");
        return;
      }
      setSubmissions(data.submissions ?? submissions);
      setVotedId(data.viewerVotedSubmissionId ?? submissionId);
    } catch {
      setError("Abstimmen fehlgeschlagen.");
    } finally {
      setPendingId(null);
    }
  }

  const totalVotes = submissions.reduce((sum, s) => sum + s.voteCount, 0);
  const sorted = [...submissions].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      {sorted.map((s) => {
        const pct = totalVotes > 0 ? Math.round((s.voteCount / totalVotes) * 100) : 0;
        const isWinner = winnerBrandId === s.brandId;
        return (
          <div key={s.id} className={`rounded-xl border p-3 ${isWinner ? "border-orange-500" : "border-zinc-800"}`}>
            <div className="mb-2 flex items-center justify-between">
              <Link href={`/brands/${s.brandSlug}`} className="text-sm font-semibold text-white hover:underline">
                {s.brandName}
              </Link>
              {isWinner && <span className="text-xs font-semibold text-orange-400">🏆 Partner</span>}
            </div>
            <video src={s.videoUrl} className="mb-2 max-h-64 w-full rounded-lg bg-black object-contain" controls playsInline preload="metadata" />
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-orange-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {s.voteCount} {s.voteCount === 1 ? "Stimme" : "Stimmen"} ({pct}%)
              </span>
              {canVote &&
                (votedId ? (
                  votedId === s.id && <span className="text-orange-400">✓ Deine Stimme</span>
                ) : (
                  <button
                    onClick={() => handleVote(s.id)}
                    disabled={pendingId === s.id}
                    className="rounded-full bg-orange-600 px-3 py-1 font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                  >
                    {pendingId === s.id ? "…" : "Abstimmen"}
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
