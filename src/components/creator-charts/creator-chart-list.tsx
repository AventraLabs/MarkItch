"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreatorChartEntry } from "@/lib/creator-charts";
import { ReportButton } from "@/components/moderation/report-button";

const MEDALS = ["🥇", "🥈", "🥉"];

export function CreatorChartList({
  initialEntries,
  initialViewerVotedSubmissionId,
  isLoggedIn,
  canVote,
}: {
  initialEntries: CreatorChartEntry[];
  initialViewerVotedSubmissionId: string | null;
  isLoggedIn: boolean;
  canVote: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
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
      const res = await fetch("/api/creator-charts/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Abstimmen fehlgeschlagen.");
        return;
      }
      setVotedId(submissionId);
      setEntries((prev) =>
        prev
          .map((e) => (e.submissionId === submissionId ? { ...e, voteCount: e.voteCount + 1 } : e))
          .sort((a, b) => b.voteCount - a.voteCount),
      );
    } catch {
      setError("Abstimmen fehlgeschlagen.");
    } finally {
      setPendingId(null);
    }
  }

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">Noch keine Videos in dieser Runde.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      {entries.map((e, i) => (
        <div key={e.submissionId} className="rounded-xl border border-zinc-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Link href={`/brands/${e.creatorSlug}`} className="flex items-center gap-1.5 text-sm font-semibold text-white hover:underline">
              {i < 3 && <span>{MEDALS[i]}</span>}
              {e.creatorName}
            </Link>
            <span className="text-xs text-zinc-500">
              {e.voteCount} {e.voteCount === 1 ? "Stimme" : "Stimmen"}
            </span>
          </div>
          <video src={e.videoUrl} className="mb-2 max-h-64 w-full rounded-lg bg-black object-contain" controls playsInline preload="metadata" />
          <div className="flex items-center justify-between">
            {canVote &&
              (votedId ? (
                votedId === e.submissionId && <p className="text-xs text-orange-400">✓ Deine Stimme</p>
              ) : (
                <button
                  onClick={() => handleVote(e.submissionId)}
                  disabled={pendingId === e.submissionId}
                  className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                >
                  {pendingId === e.submissionId ? "…" : "Abstimmen"}
                </button>
              ))}
            <ReportButton targetType="creator_submission" targetId={e.submissionId} isLoggedIn={isLoggedIn} variant="text" />
          </div>
        </div>
      ))}
    </div>
  );
}
