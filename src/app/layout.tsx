import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getOptionalUser } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/notification";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NotificationBellButton } from "@/components/nav/notification-bell-button";
import { SplashScreen } from "@/components/splash-screen";

export const metadata: Metadata = {
  title: "MarkItch",
  description: "Werbung wird zum Entertainment.",
};

// Phase 41: no viewport config existed at all, so pinch-zoom and double-tap-
// zoom stayed fully active — Luca, on a real touchscreen: swiping a Duell's
// two sides "man kann Kreise machen mit dem Video", the whole screen
// dragging "wie ein rangezoomtes Foto". That's the browser's own native
// zoom/pan taking over the gesture, not this app's swipe logic — a TikTok-
// style full-screen touch app needs it off entirely, same as the native
// app it's meant to feel like.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getOptionalUser();
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <html lang="de" className="h-full antialiased dark">
      <body className="flex min-h-full flex-col bg-black text-white font-sans">
        <SplashScreen />
        {children}
        <NotificationBellButton isLoggedIn={Boolean(user)} unreadCount={unreadCount} />
        <BottomNav isLoggedIn={Boolean(user)} />
      </body>
    </html>
  );
}
