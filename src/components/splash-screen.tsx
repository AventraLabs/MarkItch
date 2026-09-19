"use client";

import { useEffect, useState } from "react";

const VISIBLE_MS = 900;
const FADE_MS = 300;

/**
 * Shown once per real app open — mounted inside RootLayout, which the App
 * Router keeps mounted across client-side navigations (Link clicks), so
 * this only ever mounts fresh on an actual page load/reload, never again
 * while just tapping around the app. No sessionStorage needed for that.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    const hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-300 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-4xl font-black tracking-tight text-white">
        Mark<span className="text-orange-500">Itch</span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Werbung wird zum Entertainment.</p>
    </div>
  );
}
