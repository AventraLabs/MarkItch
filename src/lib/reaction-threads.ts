import type { ReactionWithBrand } from "@/lib/reaction";

export type ReactionRow = Omit<ReactionWithBrand, "createdAt"> & { createdAt: string };

/**
 * Phase 40: turns the flat list from /api/pitches/reactions into what the
 * grid + scoped feed need — a brand can now reply to another brand's
 * reaction instead of only ever to the original pitch ("Coke vs. Pepsi",
 * Luca's own example), so a reaction can have its own chain of replies.
 *
 * - `topLevel` — only direct reactions to the pitch (grid tiles; already
 *   best-liked-first as returned by the API).
 * - `flattened` — every top-level reaction immediately followed by its
 *   full reply chain, depth-first, chronological — one continuous order a
 *   viewer can scroll straight through after tapping any grid tile,
 *   without ever landing back on an unrelated thread's messages first.
 * - `startIndexById` — where a given reaction's own card sits in
 *   `flattened`, so tapping a grid tile can jump the feed straight there.
 * - `replyCountById` — total descendants of a top-level reaction, for the
 *   grid tile's "N Antworten" badge.
 */
export function buildReactionThreads(reactions: ReactionRow[]) {
  const childrenByParent = new Map<string, ReactionRow[]>();
  const topLevel: ReactionRow[] = [];
  for (const r of reactions) {
    if (r.parentReactionId) {
      const list = childrenByParent.get(r.parentReactionId) ?? [];
      list.push(r);
      childrenByParent.set(r.parentReactionId, list);
    } else {
      topLevel.push(r);
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const flattened: ReactionRow[] = [];
  const startIndexById = new Map<string, number>();
  const replyCountById = new Map<string, number>();

  function countDescendants(id: string): number {
    const children = childrenByParent.get(id) ?? [];
    return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
  }

  function pushWithDescendants(r: ReactionRow) {
    startIndexById.set(r.id, flattened.length);
    flattened.push(r);
    for (const child of childrenByParent.get(r.id) ?? []) pushWithDescendants(child);
  }

  for (const top of topLevel) {
    replyCountById.set(top.id, countDescendants(top.id));
    pushWithDescendants(top);
  }

  return { flattened, topLevel, startIndexById, replyCountById };
}
