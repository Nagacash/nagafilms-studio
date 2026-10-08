'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import FilmCraftWebLoader from '@/components/FilmCraftWebLoader';

export default function EditorDetailClient({ initialProject, initialAssets }) {
  const [project, setProject] = useState(initialProject);
  const [assets, setAssets] = useState(initialAssets || []);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/editor/projects/${project.id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Refresh failed');
    setProject(data.project);
    setAssets(data.assets || []);
  }, [project.id]);

  async function requestExport() {
    setBusy('export');
    setError('');
    try {
      const res = await fetch(`/api/editor/projects/${project.id}/export`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.project?.exportError || 'Export failed');
      setProject(data.project);
      setAssets(data.assets || assets);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function downloadPackage() {
    window.location.href = `/api/editor/projects/${project.id}/download`;
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00ff88]/70">
              Beta
            </p>
            <h1 className="text-3xl font-black tracking-tight">{project.name}</h1>
            <p className="mt-2 text-sm text-white/45">
              Status:{' '}
              <span className="text-[#00ff88]">{project.status}</span>
              {project.createdAt
                ? ` · Created ${new Date(project.createdAt).toLocaleString()}`
                : ''}
            </p>
          </div>
          <Link href="/editor" className="text-xs text-white/40 hover:text-[#00ff88]">
            ← Projects
          </Link>
        </div>

        <FilmCraftWebLoader className="mb-6" />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {project.exportError && (
          <p className="mb-4 text-sm text-red-400">{project.exportError}</p>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadPackage}
            className="rounded-md bg-[#00ff88] px-4 py-2 text-sm font-bold text-black"
          >
            Download FilmCraft package
          </button>
          <button
            type="button"
            disabled={busy === 'export'}
            onClick={requestExport}
            className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-[#00ff88]/40 disabled:opacity-40"
          >
            {busy === 'export' ? 'Exporting…' : 'Request export'}
          </button>
          <button
            type="button"
            onClick={() => refresh().catch((e) => setError(e.message))}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/50"
          >
            Refresh
          </button>
        </div>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">
          Source clips
        </h2>
        {assets.length === 0 ? (
          <p className="text-sm text-white/40">No assets on this project.</p>
        ) : (
          <ul className="space-y-3">
            {assets.map((a) => (
              <li
                key={a.id}
                className="flex gap-3 rounded-lg border border-white/10 bg-[#0a0a0a] p-3"
              >
                {a.kind === 'video' || a.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  a.kind === 'image' ? (
                    <img
                      src={a.sourceUrl}
                      alt=""
                      className="h-16 w-28 rounded object-cover bg-black"
                    />
                  ) : (
                    <video
                      src={a.sourceUrl}
                      className="h-16 w-28 rounded object-cover bg-black"
                      muted
                      playsInline
                    />
                  )
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded bg-white/5 text-xs text-white/40">
                    {a.kind}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.localName}</p>
                  <p className="text-[11px] text-white/35">
                    {a.kind}
                    {a.durationMs ? ` · ${(a.durationMs / 1000).toFixed(1)}s` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
