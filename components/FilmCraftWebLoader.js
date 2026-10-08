'use client';

/**
 * Placeholder for future FilmCraft WebAssembly embedding
 * (apps/filmcraft-web — see FilmCraft docs/web.md).
 * Kept behind NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED=false for v1.
 */
export default function FilmCraftWebLoader({ className = '' }) {
  const enabled =
    String(process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED || '').toLowerCase() ===
      'true' ||
    String(process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED || '') === '1';

  if (!enabled) {
    return (
      <div
        className={`rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50 ${className}`}
      >
        FilmCraft web editor is not enabled yet. Use the download package and open
        it in the FilmCraft desktop app. WASM embedding comes later.
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ${className}`}
    >
      FilmCraft WebAssembly loader is flagged on, but the embed is not wired in this
      build. Keep NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED=false until filmcraft-web is
      integrated.
    </div>
  );
}
