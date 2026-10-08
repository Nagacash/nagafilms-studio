'use client';

import { useEffect, useRef, useState } from 'react';

const FILMCRAFT_SRC = '/filmcraft-web/index.html?empty&norecover';

function isWebEnabled() {
  const v = String(process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Embed FilmCraft web (WASM) and import project media via window.filmcraft.
 * Requires static build at public/filmcraft-web/ and COOP/COEP on that path.
 */
export default function FilmCraftWebLoader({
  className = '',
  projectId,
  assets = [],
  /** workspace = fill parent height (editor page); compact = short banner only */
  variant = 'workspace',
}) {
  const enabled = isWebEnabled();
  const iframeRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const importedKey = useRef('');

  useEffect(() => {
    if (!enabled || variant === 'compact') return undefined;

    let cancelled = false;
    let timer;

    async function waitForApi(win) {
      const deadline = Date.now() + 120000;
      while (Date.now() < deadline && !cancelled) {
        if (win?.filmcraftLoad?.fatal) {
          throw new Error(String(win.filmcraftLoad.fatal).slice(0, 300));
        }
        if (win?.filmcraft && typeof win.filmcraft.importUrl === 'function') {
          return win.filmcraft;
        }
        await new Promise((r) => {
          timer = setTimeout(r, 250);
        });
      }
      throw new Error('FilmCraft web did not become ready (WASM load timeout)');
    }

    async function runImport() {
      const iframe = iframeRef.current;
      if (!iframe || !projectId) return;

      const assetKey = `${projectId}:${assets.map((a) => a.id).join(',')}`;
      if (assetKey === importedKey.current) return;

      setStatus('loading');
      setMessage('Loading editor…');
      try {
        const api = await waitForApi(iframe.contentWindow);
        if (cancelled) return;

        if (!assets.length) {
          importedKey.current = assetKey;
          setStatus('ready');
          setMessage('Ready — drop media onto the timeline.');
          return;
        }

        setMessage(`Importing ${assets.length} clip${assets.length === 1 ? '' : 's'}…`);
        const errors = [];
        for (const asset of assets) {
          if (cancelled) return;
          const name = asset.localName || `clip-${asset.id}`;
          const url = `/api/editor/projects/${projectId}/assets/${asset.id}/file`;
          try {
            if (typeof api.importUrl === 'function') {
              await api.importUrl(url, name);
            } else if (typeof api.importFiles === 'function') {
              const res = await fetch(url, { credentials: 'include' });
              if (!res.ok) throw new Error(`fetch ${res.status}`);
              const blob = await res.blob();
              const file = new File([blob], name, {
                type: blob.type || 'application/octet-stream',
              });
              await api.importFiles([file]);
            }
          } catch (err) {
            errors.push(`${name}: ${err.message || err}`);
          }
        }

        importedKey.current = assetKey;
        if (errors.length) {
          setStatus('partial');
          setMessage(`Imported with errors: ${errors.slice(0, 3).join('; ')}`);
        } else {
          setStatus('ready');
          setMessage(`Imported ${assets.length} item${assets.length === 1 ? '' : 's'}.`);
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.message || 'Editor failed to start');
      }
    }

    const onLoad = () => {
      runImport().catch(() => {});
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', onLoad);
      if (iframe.contentDocument?.readyState === 'complete') {
        onLoad();
      }
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      iframe?.removeEventListener('load', onLoad);
    };
  }, [enabled, projectId, assets, variant]);

  if (!enabled) {
    return (
      <div
        className={`rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50 ${className}`}
      >
        Naga Film Editor is not enabled on this deploy. Download package still works when
        handoff is on.
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-md border border-[#00ff88]/20 bg-[#00ff88]/5 px-4 py-3 text-sm text-white/70 ${className}`}
      >
        Naga Film Editor runs in the browser on each project page — open a project to cut.
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3 text-xs text-white/45">
        <span>
          {status === 'idle' && 'Starting…'}
          {(status === 'loading' || status === 'ready' || status === 'partial') && message}
          {status === 'error' && message}
        </span>
        <a
          href={FILMCRAFT_SRC}
          target="_blank"
          rel="noreferrer"
          className="text-[#00ff88]/80 hover:text-[#00ff88]"
        >
          Open fullscreen
        </a>
      </div>
      {status === 'error' && (
        <p className="mb-2 shrink-0 text-sm text-red-400">{message}</p>
      )}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#1b1c1f]">
        <iframe
          ref={iframeRef}
          title="Naga Film Editor"
          src={FILMCRAFT_SRC}
          className="h-full min-h-[70svh] w-full border-0 lg:min-h-0"
          allow="cross-origin-isolated; autoplay; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
