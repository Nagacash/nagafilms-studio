'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import EffectCraftWebLoader from '@/components/EffectCraftWebLoader';

export default function MotionDetailClient({
  initialProject,
  initialOutputs,
  initialEditorProject,
  initialSourceAsset,
  initialMedia,
}) {
  const [project, setProject] = useState(initialProject);
  const [outputs, setOutputs] = useState(initialOutputs || []);
  const [media] = useState(initialMedia || []);
  const [editorProject] = useState(initialEditorProject);
  const [sourceAsset] = useState(initialSourceAsset);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);

  const webEnabled =
    process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED === '1';

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/motion/projects/${project.id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Refresh failed');
    setProject(data.project);
    setOutputs(data.outputs || []);
  }, [project.id]);

  async function downloadForMotion() {
    setBusy('open');
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/motion/projects/${project.id}/open`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Handoff failed');
      const url = data.downloadUrl || `/api/motion/projects/${project.id}/download`;
      window.location.href = url;
      setMessage('Package download started.');
      await refresh().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('import');
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/motion/projects/${project.id}/outputs`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setMessage('Motion render imported.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function addToTimeline(outputId) {
    setBusy(`tl-${outputId}`);
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `/api/motion/projects/${project.id}/outputs/${outputId}/add-to-timeline`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add to timeline');
      setMessage(
        data.timelineInsert === 'client_import'
          ? 'Attached to Film Editor. Open the editor to place the clip.'
          : 'Attached as an editor asset. Open Film Editor to place it on the timeline.'
      );
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const previewUrl = sourceAsset?.sourceUrl || media[0]?.proxyUrl || null;

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
              Motion & VFX
            </p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              {project.title}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden text-[11px] text-white/35 sm:inline">
            <span className="text-[#00ff88]">{project.status}</span>
          </span>
          <Link href="/motion" className="text-xs text-white/40 hover:text-[#00ff88]">
            Projects
          </Link>
          {editorProject && (
            <Link
              href={`/editor/${editorProject.id}`}
              className="text-xs text-white/40 hover:text-[#00ff88]"
            >
              Back to Project
            </Link>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-white/10 bg-[#0a0a0a] px-4 py-4 lg:w-[300px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
          <div>
            <h2 className="text-sm font-bold text-white">
              {webEnabled ? 'Work in the browser' : 'Desktop handoff'}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              {webEnabled
                ? 'Edit Motion & VFX here. Export from the editor, then Import Motion Render to attach the file — or download a package for desktop.'
                : 'Download the package, finish on desktop, then import the render back.'}
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-[#00ff88]/90">{message}</p>}
          {project.metadata?.error && (
            <p className="text-sm text-red-400">{project.metadata.error}</p>
          )}

          {!webEnabled && previewUrl && (
            <div className="overflow-hidden rounded-md border border-white/10 bg-black">
              {sourceAsset?.kind === 'image' || media[0]?.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="max-h-40 w-full object-contain" />
              ) : (
                <video src={previewUrl} controls className="max-h-40 w-full" playsInline />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy === 'open' || project.status === 'failed'}
              onClick={downloadForMotion}
              className="rounded-md border border-white/15 px-3 py-2 text-left text-xs text-white/80 hover:border-[#00ff88]/40 disabled:opacity-40"
            >
              {busy === 'open' ? 'Preparing…' : 'Download for Motion & VFX'}
            </button>
            <button
              type="button"
              disabled={busy === 'import'}
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-white/15 px-3 py-2 text-left text-xs text-white/80 hover:border-[#00ff88]/40 disabled:opacity-40"
            >
              {busy === 'import' ? 'Uploading…' : 'Import Motion Render'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp,image/gif,.mp4,.webm,.mov,.png,.jpg,.jpeg,.webp,.gif"
              className="hidden"
              onChange={onImportFile}
            />
            <button
              type="button"
              onClick={() => refresh().catch((e) => setError(e.message))}
              className="rounded-md border border-white/10 px-3 py-2 text-left text-xs text-white/50"
            >
              Refresh
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Source media
            </h3>
            {media.length === 0 ? (
              <p className="text-xs text-white/35">No media on this project.</p>
            ) : (
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {media.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px]"
                  >
                    <p className="truncate font-medium">{m.filename}</p>
                    <p className="text-[10px] text-white/35">{m.kind}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Outputs
            </h3>
            {outputs.length === 0 ? (
              <p className="text-xs text-white/35">No renders imported yet.</p>
            ) : (
              <ul className="space-y-2">
                {outputs.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-2"
                  >
                    <p className="truncate text-[11px] font-medium">{o.filename}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <a
                        href={`/api/motion/projects/${project.id}/outputs/${o.id}/file`}
                        className="text-[10px] text-white/50 hover:text-[#00ff88]"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        disabled={!editorProject || busy === `tl-${o.id}`}
                        onClick={() => addToTimeline(o.id)}
                        className="text-[10px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                      >
                        {busy === `tl-${o.id}` ? 'Adding…' : 'Add to Film Timeline'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="min-h-0 min-w-0 flex-1 p-3 sm:p-4">
          <EffectCraftWebLoader
            className="h-full"
            projectId={project.id}
            media={media}
            variant="workspace"
          />
        </section>
      </div>
    </main>
  );
}
