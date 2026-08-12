'use client';

import { useEffect, useRef } from 'react';

/**
 * Autoplay-safe muted loop for the landing page showreel.
 * Client-only play() handles browsers that ignore server-rendered autoPlay.
 */
export default function LandingShowreel({ className = '', poster = '/hero.jpg' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const play = () => {
      void el.play().catch(() => {
        // Autoplay blocked — poster remains visible.
      });
    };

    play();
    el.addEventListener('loadeddata', play);
    return () => el.removeEventListener('loadeddata', play);
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      className={className}
    >
      <source src="/video/landing-cta.webm" type="video/webm" />
      <source src="/video/landing-cta.mp4" type="video/mp4" />
    </video>
  );
}
