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

  const motionEnabled =
    process.env.NEXT_PUBLIC_MOTION_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_MOTION_ENABLED === '1';

  async function openMotionVfx(assetId) {
    setBusy(assetId ? `motion-${assetId}` : 'motion');
    setError('');
    try {
      const body = {
        editorProjectId: project.id,
        title: `${project.name} — Motion`,
      };
      if (assetId) body.editorAssetId = assetId;
      const res = await fetch('/api/motion/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open Motion & VFX');
      const id = data.project?.id;
      if (!id) throw new Error('No Motion project id');
      window.location.href = `/motion/${id}`;
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-[#050505] text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0" title="Naga Films home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/NAGA_round.png"
              alt="Naga Films"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#00ff88]/70">
              Naga Film Editor
            </p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {project.name}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden text-[11px] text-white/35 sm:inline">
            <span className="text-[#00ff88]">{project.status}</span>
          </span>
          <Link
            href="/editor"
            className="text-xs text-white/40 hover:text-[#00ff88]"
          >
            Projects
          </Link>
          <Link href="/studio/video" className="text-xs text-white/40 hover:text-[#00ff88]">
            Studio
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-white/10 bg-[#0a0a0a] px-4 py-4 lg:w-[280px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div>
            <h2 className="text-sm font-bold text-white">Cut in the browser</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              Naga Film Editor is built in — timeline, bins, and playback on this page.
              Clips from Studio land here when you use Edit in FilmCraft.
            </p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-white/40">
              <li>· Trim and arrange on the timeline</li>
              <li>· Drop more media onto the canvas</li>
              <li>· Download OTIO zip for desktop FilmCraft if you need it</li>
            </ul>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {project.exportError && (
            <p className="text-sm text-red-400">{project.exportError}</p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={downloadPackage}
              className="rounded-md border border-white/15 px-3 py-2 text-left text-xs text-white/80 hover:border-[#00ff88]/40"
            >
              Download package
            </button>
            <button
              type="button"
              disabled={busy === 'export'}
              onClick={requestExport}
              className="rounded-md border border-white/15 px-3 py-2 text-left text-xs text-white/80 hover:border-[#00ff88]/40 disabled:opacity-40"
            >
              {busy === 'export' ? 'Exporting…' : 'Request export'}
            </button>
            <button
              type="button"
              onClick={() => refresh().catch((e) => setError(e.message))}
              className="rounded-md border border-white/10 px-3 py-2 text-left text-xs text-white/50"
            >
              Refresh
            </button>
            {motionEnabled && (
              <button
                type="button"
                disabled={busy === 'motion' || assets.length === 0}
                onClick={() => openMotionVfx(assets[0]?.id)}
                className="rounded-md border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-2 text-left text-xs font-semibold text-[#00ff88] disabled:opacity-40"
              >
                {busy === 'motion' || String(busy).startsWith('motion-')
                  ? 'Opening…'
                  : 'Open Motion & VFX'}
              </button>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Source clips
            </h3>
            {assets.length === 0 ? (
              <p className="text-xs text-white/35">No assets on this project.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto lg:max-h-none">
                {assets.map((a) => (
                  <li
                    key={a.id}
                    className="flex gap-2 rounded-md border border-white/10 bg-black/40 p-2"
                  >
                    {a.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.sourceUrl}
                        alt=""
                        className="h-12 w-16 shrink-0 rounded object-cover bg-black"
                      />
                    ) : a.kind === 'video' ? (
                      <video
                        src={a.sourceUrl}
                        className="h-12 w-16 shrink-0 rounded object-cover bg-black"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] text-white/40">
                        {a.kind}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{a.localName}</p>
                      <p className="text-[10px] text-white/35">
                        {a.kind}
                        {a.durationMs ? ` · ${(a.durationMs / 1000).toFixed(1)}s` : ''}
                      </p>
                      {motionEnabled && (
                        <button
                          type="button"
                          disabled={busy === `motion-${a.id}`}
                          onClick={() => openMotionVfx(a.id)}
                          className="mt-1 text-[10px] text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                        >
                          Open Motion & VFX
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 p-3 sm:p-4">
          <FilmCraftWebLoader
            className="h-full"
            projectId={project.id}
            assets={assets}
            variant="workspace"
          />
        </section>
      </div>
    </main>
  );
}
