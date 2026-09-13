"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, Building2, Bell, User, Plus, type LucideIcon } from "lucide-react";

// Phase 12d: real line icons instead of emoji. Emoji render inconsistently
// across platforms (different weight/style per OS, some look like clip art)
// and read as a prototype, not a serious product — TikTok, Instagram etc.
// all use a single consistent icon set instead. lucide-react gives us that:
// one stroke width, one visual language, crisp at any size.
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/pitches", label: "Pitches", icon: Mic },
  { href: "/brands", label: "Marken", icon: Building2 },
];

export function BottomNav({ isLoggedIn, unreadCount = 0 }: { isLoggedIn: boolean; unreadCount?: number }) {
  const pathname = usePathname();
  // Phase 21: a real "+" tab, TikTok/Instagram-style — every posting action
  // (Solo-Pitch, Creator-Video, Partner-Casting) lives behind this one
  // entry point now instead of being buried as forms inside /profile. See
  // src/app/post/page.tsx for the picker itself.
  const postTab = { href: isLoggedIn ? "/post" : "/login", label: "Posten", icon: Plus };
  // Phase 10: a real destination for reminders/notifications, not just a
  // block buried in Profile — see /notifications.
  const notificationsTab = {
    href: isLoggedIn ? "/notifications" : "/login",
    label: "Erinnerungen",
    icon: Bell,
  };
  const profileTab = { href: isLoggedIn ? "/profile" : "/login", label: isLoggedIn ? "Profil" : "Anmelden", icon: User };

  const allTabs = [...TABS, postTab, notificationsTab, profileTab];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 bg-black/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      {allTabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const showBadge = tab === notificationsTab && isLoggedIn && unreadCount > 0;
        const Icon = tab.icon;

        if (tab === postTab) {
          return (
            <Link key={tab.label} href={tab.href} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-zinc-400">
              <span className="-mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <Icon size={22} strokeWidth={2.5} />
              </span>
              {tab.label}
            </Link>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-orange-500" : "text-zinc-400"
            }`}
          >
            <span className="relative">
              <Icon size={23} strokeWidth={active ? 2.25 : 1.75} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
