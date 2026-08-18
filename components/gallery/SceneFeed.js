'use client';

import { useState, useCallback, useEffect } from 'react';
import SceneCard from '@/components/gallery/SceneCard';

export default function SceneFeed({ scenes }) {
  const [open, setOpen] = useState(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((i) => (i === null ? null : (i + 1) % scenes.length)),
    [scenes.length],
  );
  const prev = useCallback(
    () => setOpen((i) => (i === null ? null : (i - 1 + scenes.length) % scenes.length)),
    [scenes.length],
  );

  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, next, prev]);

  if (!scenes.length) {
    return (
      <div className="nf-empty">
        <h3>No scenes found</h3>
        <p>Try a different search or browse all movie stills.</p>
      </div>
    );
  }

  return (
    <>
      <div className="nf-scene-feed">
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            onExpand={() => setOpen(i)}
          />
        ))}
      </div>

      {open !== null && (
        <div className="nf-lightbox" role="dialog" aria-modal="true" aria-label="Frame viewer" onClick={close}>
          <button className="nf-lightbox-close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <button className="nf-lightbox-nav nf-lightbox-prev" aria-label="Previous frame" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <img src={scenes[open].src} alt={`${scenes[open].title} — frame ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          <button className="nf-lightbox-nav nf-lightbox-next" aria-label="Next frame" onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
