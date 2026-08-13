'use client';

import { useEffect, useRef } from 'react';
import { NEON_MEDIA_CLASS, NeonMediaOverlays } from './NeonMediaFrame.js';

/** Landing showcase card clip — same treatment as the hero. */
export default function LandingShowcaseClip({ src, poster, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const play = () => {
      void el.play().catch(() => {});
    };
    play();
    el.addEventListener('loadeddata', play);
    return () => el.removeEventListener('loadeddata', play);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        className={NEON_MEDIA_CLASS}
      >
        <source src={src} type="video/mp4" />
      </video>
      <NeonMediaOverlays compact />
    </div>
  );
}
