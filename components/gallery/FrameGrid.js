'use client';

import { useState, useCallback, useEffect } from 'react';

export default function FrameGrid({ frames, alt }) {
  const [open, setOpen] = useState(null); // index or null

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(() => setOpen((i) => (i === null ? null : (i + 1) % frames.length)), [frames.length]);
  const prev = useCallback(() => setOpen((i) => (i === null ? null : (i - 1 + frames.length) % frames.length)), [frames.length]);

  useEffect(() => {
    if (open === null) return;
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

  return (
    <>
      <div className="nf-frames">
        {frames.map((src, i) => (
          <button key={i} className="nf-frame" onClick={() => setOpen(i)} aria-label={`Open frame ${i + 1}`}>
            <img src={src} alt={`${alt} — frame ${i + 1}`} loading={i < 10 ? 'eager' : 'lazy'} decoding="async" />
          </button>
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
          <img src={frames[open]} alt={`${alt} — frame ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          <button className="nf-lightbox-nav nf-lightbox-next" aria-label="Next frame" onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
