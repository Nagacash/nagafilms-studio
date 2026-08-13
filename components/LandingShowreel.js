'use client';

import { useEffect, useRef } from 'react';
import { NEON_MEDIA_CLASS, NeonMediaOverlays } from './NeonMediaFrame.js';

/**
 * Landing showreel — landing-cta loop with hero-style neon framing.
 */
export default function LandingShowreel({ className = '', poster = '/hero.jpg', compact = false, blur = false }) {
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
  }, []);

  return (
    <div className={`relative overflow-hidden ${blur ? 'h-full w-full' : ''}`}>
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        className={`${NEON_MEDIA_CLASS} ${className}${blur ? ' scale-110 blur-md' : ''}`}
      >
        <source src="/video/landing-cta.webm" type="video/webm" />
        <source src="/video/landing-cta.mp4" type="video/mp4" />
      </video>
      <NeonMediaOverlays compact={compact || blur} />
      {blur && <div className="pointer-events-none absolute inset-0 bg-[#0a0812]/50" />}
    </div>
  );
}
