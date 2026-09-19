import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * Phase 28: moved out of the bottom nav (Instagram/TikTok convention —
 * notifications live as a corner icon, not a dedicated tab, freeing up a
 * bottom-nav slot). Fixed top-LEFT, not top-right — the feed's own per-card
 * mute indicator already occupies top-right on every video card (see
 * feed-solo-pitch-card.tsx/feed-duel-card.tsx), so this avoids sitting on
 * top of it.
 */
export function NotificationBellButton({ isLoggedIn, unreadCount = 0 }: { isLoggedIn: boolean; unreadCount?: number }) {
  if (!isLoggedIn) return null;

  return (
    <Link
      href="/notifications"
      aria-label="Erinnerungen"
      className="fixed left-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
      style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
    >
      <Bell size={20} strokeWidth={1.75} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
