/**
 * Phase 41: every route here was fully server-rendered with no
 * `loading.tsx` anywhere in the app — Next.js showed *nothing* during a
 * navigation until the destination page's data finished loading, which on
 * a live deployment (especially inside the Capacitor WKWebView) reads as
 * "did my tap even register?" (Luca: "wieso lagged alles so... es dauert
 * paar Sekunden bis man auf dem Tab dann ist"). A `loading.tsx` per route
 * segment shows this immediately on navigation while the real page streams
 * in behind it — doesn't make the data faster, but the app now visibly
 * reacts to every tap instantly instead of appearing frozen.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <p className="animate-pulse text-sm text-zinc-500">Lädt…</p>
    </div>
  );
}
