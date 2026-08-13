'use client';

import { useEffect, useRef } from 'react';
import {
  NEON_MEDIA_CLASS,
  NeonMediaOverlays,
  NeonMediaCaption,
} from './NeonMediaFrame.js';

/**
 * Dashboard mood strip — same clip styling as the landing hero.
 */
export default function StudioTabMoodStrip({ aesthetic }) {
  const videoRef = useRef(null);
  const stripRef = useRef(null);

  useEffect(() => {
    const playEl = (el) => {
      void el.play().catch(() => {});
    };

    if (aesthetic?.type === 'filmstrip') {
      const root = stripRef.current;
      if (!root) return undefined;
      root.querySelectorAll('video').forEach(playEl);
      const onLoad = (e) => {
        if (e.target instanceof HTMLVideoElement) playEl(e.target);
      };
      root.addEventListener('loadeddata', onLoad, true);
      return () => root.removeEventListener('loadeddata', onLoad, true);
    }

    if (aesthetic?.type !== 'video') return undefined;
    const el = videoRef.current;
    if (!el) return undefined;
    const play = () => playEl(el);
    play();
    el.addEventListener('loadeddata', play);
    return () => el.removeEventListener('loadeddata', play);
  }, [aesthetic?.src, aesthetic?.type, aesthetic?.frames]);

  if (!aesthetic) return null;

  const objectPosition = aesthetic.objectPosition || 'center';

  const renderMedia = (frame, ref) => {
    const pos = frame?.objectPosition || objectPosition;
    const cls = `${NEON_MEDIA_CLASS} ${frame?.className || ''}`.trim();

    if (frame?.type === 'video' || aesthetic.type === 'video') {
      return (
        <video
          ref={ref}
          src={frame?.src || aesthetic.src}
          poster={frame?.poster || aesthetic.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={cls}
          style={{ objectPosition: pos }}
        />
      );
    }

    return (
      <img
        src={frame?.src || aesthetic.src}
        alt=""
        className={cls}
        style={{ objectPosition: pos }}
      />
    );
  };

  return (
    <div
      ref={stripRef}
      className="relative z-10 h-32 flex-shrink-0 overflow-hidden border-b border-[#ff6ec7]/20 sm:h-40"
      aria-hidden
    >
      <div className="absolute inset-0 overflow-hidden">
        {aesthetic.type === 'filmstrip' ? (
          <div className="flex h-full w-full">
            {(aesthetic.frames || []).map((frame, i) => (
              <div
                key={`${frame.src}-${i}`}
                className="relative h-full overflow-hidden"
                style={{ width: frame.width || `${100 / (aesthetic.frames?.length || 1)}%` }}
              >
                {renderMedia(frame)}
                {i > 0 && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-px bg-[#ff6ec7]/25" />
                )}
              </div>
            ))}
          </div>
        ) : (
          renderMedia(null, videoRef)
        )}
      </div>

      <NeonMediaOverlays light={aesthetic.overlayLight} compact={aesthetic.overlayLight} />
      <NeonMediaCaption>{aesthetic.caption}</NeonMediaCaption>
    </div>
  );
}
