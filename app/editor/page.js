import Link from 'next/link';
import { auth } from '@/lib/auth';
import { isFilmCraftEnabled } from '@/lib/filmcraft/config';
import { listProjectsForUser } from '@/lib/filmcraft/projects';
import FilmCraftWebLoader from '@/components/FilmCraftWebLoader';

export const metadata = {
  title: 'FilmCraft editor — Naga Films',
  description: 'Beta FilmCraft handoff projects from generated clips.',
};

export default async function EditorListPage() {
  const enabled = isFilmCraftEnabled();
  const session = await auth();

  let projects = [];
  let error = null;
  if (enabled && session?.user?.id) {
    try {
      projects = await listProjectsForUser(session.user.id);
    } catch (err) {
      error = err.message || 'Failed to load projects';
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00ff88]/70">
              Beta
            </p>
            <h1 className="text-3xl font-black tracking-tight">FilmCraft handoff</h1>
            <p className="mt-2 text-sm text-white/45">
              Package generated clips for FilmCraft. Editing still happens in FilmCraft
              desktop — the web embed is not active yet.
            </p>
          </div>
          <Link href="/" className="text-xs text-white/40 hover:text-[#00ff88]">
            ← Studio
          </Link>
        </div>

        <FilmCraftWebLoader className="mb-8" />

        {!enabled && (
          <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            FilmCraft handoff is off. Set FILMCRAFT_ENABLED=true and
            NEXT_PUBLIC_FILMCRAFT_ENABLED=true, then redeploy.
          </p>
        )}

        {enabled && !session?.user?.id && (
          <p className="text-sm text-white/50">
            <Link href="/login?callbackUrl=/editor" className="text-[#00ff88]">
              Log in
            </Link>{' '}
            to see your editor projects.
          </p>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {enabled && session?.user?.id && !error && projects.length === 0 && (
          <p className="rounded-md border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/40">
            No editor projects yet. In Video Studio, select clips and click Edit in
            FilmCraft.
          </p>
        )}

        {projects.length > 0 && (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/editor/${p.id}`}
                  className="block rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-4 hover:border-[#00ff88]/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[11px] uppercase tracking-wider text-white/35">
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/35">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
