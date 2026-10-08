'use client';

import { useEffect, useRef, useState } from 'react';

// naga=2 busts sticky iframe/html cache after rebrand builds
const EFFECTCRAFT_SRC = '/effectcraft-web/index.html?empty&naga=2';

function isWebEnabled() {
  const v = String(process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Embed EffectCraft web (WASM) and import project media via window.effectcraft.addFile.
 * Requires static build at public/effectcraft-web/.
 */
export default function EffectCraftWebLoader({
  className = '',
  projectId,
  media = [],
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
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline && !cancelled) {
        if (win?.effectcraftLoad?.fatal) {
          throw new Error(String(win.effectcraftLoad.fatal).slice(0, 300));
        }
        if (win?.effectcraft && typeof win.effectcraft.addFile === 'function') {
          // Prefer waiting until WASM init finished when readyMs is present
          if (win.effectcraftLoad?.readyMs != null || win.effectcraftLoad?.wasmMs != null) {
            try {
              const info = win.effectcraft.info?.();
              if (info || win.effectcraft.addFile) return win.effectcraft;
            } catch {
              /* still booting */
            }
          }
          if (typeof win.effectcraft.info === 'function') {
            try {
              win.effectcraft.info();
              return win.effectcraft;
            } catch {
              /* boot */
            }
          }
        }
        await new Promise((r) => {
          timer = setTimeout(r, 300);
        });
      }
      throw new Error('Motion & VFX editor did not become ready (WASM load timeout)');
    }

    async function runImport() {
      const iframe = iframeRef.current;
      if (!iframe || !projectId) return;

      const assetKey = `${projectId}:${media.map((m) => m.id).join(',')}`;
      if (assetKey === importedKey.current) return;

      setStatus('loading');
      setMessage('Loading Motion & VFX editor…');
      try {
        const api = await waitForApi(iframe.contentWindow);
        if (cancelled) return;

        if (!media.length) {
          importedKey.current = assetKey;
          setStatus('ready');
          setMessage('Ready — import media or drop files into the editor.');
          return;
        }

        setMessage(`Importing ${media.length} clip${media.length === 1 ? '' : 's'}…`);
        const errors = [];
        for (const item of media) {
          if (cancelled) return;
          const name = item.filename || `clip-${item.id}`;
          const url =
            item.proxyUrl ||
            `/api/motion/projects/${projectId}/media/${item.id}/file`;
          try {
            await api.addFile(url, name);
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
          setMessage(`Imported ${media.length} item${media.length === 1 ? '' : 's'}.`);
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
  }, [enabled, projectId, media, variant]);

  if (!enabled) {
    return (
      <div
        className={`rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50 ${className}`}
      >
        In-browser Motion & VFX is off. Use Download for Motion & VFX for the desktop package.
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`rounded-md border border-[#00ff88]/20 bg-[#00ff88]/5 px-4 py-3 text-sm text-white/70 ${className}`}
      >
        Motion & VFX runs in the browser on each project page — open a project to work.
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
          href={EFFECTCRAFT_SRC}
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
          title="Motion & VFX"
          src={EFFECTCRAFT_SRC}
          className="h-full min-h-[70svh] w-full border-0 lg:min-h-0"
          allow="fullscreen; clipboard-read; clipboard-write; autoplay"
          allowFullScreen
        />
      </div>
    </div>
  );
}
