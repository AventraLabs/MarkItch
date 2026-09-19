import type { Metadata } from "next";
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
