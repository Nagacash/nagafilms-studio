'use client';

import { useEffect, useRef } from 'react';

/**
 * Thin decorative mood strip under the studio tab bar — changes per nav section.
 * Bright, neon-lit — not crushed dark.
 */
export default function StudioTabMoodStrip({ aesthetic }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (aesthetic?.type !== 'video') return undefined;
    const el = videoRef.current;
    if (!el) return undefined;
    const play = () => {
      void el.play().catch(() => {});
    };
    play();
    el.addEventListener('loadeddata', play);
    return () => el.removeEventListener('loadeddata', play);
  }, [aesthetic?.src, aesthetic?.type]);

  if (!aesthetic) return null;

  const mediaClass =
    'h-full w-full object-cover object-center brightness-[0.92] contrast-[1.08] saturate-[1.22]';

  return (
    <div
      className="relative h-24 flex-shrink-0 overflow-hidden border-b border-[#ff6ec7]/15 sm:h-28"
      aria-hidden
    >
      {aesthetic.type === 'video' ? (
        <video
          ref={videoRef}
          src={aesthetic.src}
          poster={aesthetic.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={mediaClass}
        />
      ) : (
        <img src={aesthetic.src} alt="" className={mediaClass} />
      )}

      {/* Neon wash — warm magenta + cool cyan, not a black crush */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#ff6ec7]/12 via-transparent to-[#00d4ff]/14" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/75 via-[#0a0812]/15 to-[#ff6ec7]/8" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#00ff88]/10 to-transparent" />

      {/* Bottom accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ff6ec7]/60 to-transparent" />

      {aesthetic.caption && (
        <span className="absolute bottom-2.5 right-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#ffb8e8]/70">
          {aesthetic.caption}
        </span>
      )}
    </div>
  );
}
