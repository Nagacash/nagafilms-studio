'use client';

import { useEffect, useRef } from 'react';

/**
 * Full-bleed landing hero — animated clip from the hero portrait (poster fallback).
 */
export default function LandingHeroVideo({ className = '' }) {
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
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/hero.jpg"
      aria-label="Naga Films Studio character portrait in motion"
      className={className}
    >
      <source src="/video/landing-cta.webm" type="video/webm" />
      <source src="/video/landing-cta.mp4" type="video/mp4" />
    </video>
  );
}
