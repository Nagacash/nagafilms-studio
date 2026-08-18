'use client';

import { useEffect, useState, useCallback } from 'react';

export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((next) => {
    setIndex((prev) => (next + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => go(index + 1), 8000);
    return () => clearInterval(t);
  }, [index, count, go]);

  if (count === 0) return null;

  return (
    <section className="nf-hero" aria-roledescription="carousel" aria-label="Featured">
      <div className="nf-hero-slide">
        {slides.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== index}
            style={{
              position: i === index ? 'relative' : 'absolute',
              inset: 0,
              opacity: i === index ? 1 : 0,
              transition: 'opacity .6s ease',
              pointerEvents: i === index ? 'auto' : 'none',
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <img className="nf-hero-bg" src={s.imageUrl} alt="" />
            <div className="nf-hero-gradient" />
            <div className="nf-hero-content">
              <h2 className="nf-hero-title">{s.title}</h2>
              <p className="nf-hero-sub">{s.subtitle}</p>
              {s.showButton && (
                <a className="nf-hero-cta" href={s.buttonUrl}>{s.buttonText} →</a>
              )}
            </div>
          </div>
        ))}

        {count > 1 && (
          <div className="nf-hero-controls">
            <div className="nf-hero-dots">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  className={`nf-hero-dot${i === index ? ' is-active' : ''}`}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <button className="nf-hero-arrow" aria-label="Previous slide" onClick={() => go(index - 1)}>
              <ChevronLeft />
            </button>
            <button className="nf-hero-arrow" aria-label="Next slide" onClick={() => go(index + 1)}>
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
