'use client';

import { useEffect, useRef } from 'react';

/** Autoplay-safe muted loop for landing showcase clips. */
export default function LandingShowcaseClip({ src, className = '' }) {
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
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
