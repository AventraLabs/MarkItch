"use client";

// Phase 38: catches a crash in the root layout itself (bottom nav,
// notification bell, splash screen) — error.tsx alone can't, since it
// renders *inside* the layout. Must define its own <html>/<body>, since it
// replaces the whole root layout while active (Next.js requirement).
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="de" className="h-full antialiased dark">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
        <p className="text-lg font-semibold">Etwas ist schiefgelaufen.</p>
        <p className="text-sm text-zinc-400">Das ist ein Fehler in der App, nicht bei dir — einfach nochmal versuchen.</p>
        <button
          onClick={retry}
          className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-500"
        >
          Nochmal versuchen
        </button>
      </body>
    </html>
  );
}
