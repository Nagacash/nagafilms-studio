'use client';

import Link from 'next/link';
import ColorPalette from '@/components/gallery/ColorPalette';
import OriginBadge from '@/components/gallery/OriginBadge';
import { sceneFacetHref } from '@/lib/gallery/facets';

export default function SceneCard({ scene, onExpand }) {
  const {
    src,
    title,
    year,
    slug,
    director,
    cinematographer,
    country,
    origin,
    palette,
    tags,
    color,
    intExt,
    timeOfDay,
    aspectRatio,
    frameSize,
    shotType,
    composition,
    lighting,
    camera,
    lenses,
    actors,
  } = scene;

  const metaRows = [
    { label: 'Origin', value: origin === 'photo' ? 'Photograph' : 'AI-generated' },
    { label: 'Director', value: director },
    { label: 'Cinematographer', value: cinematographer },
    { label: 'Actors', value: actors?.length ? actors.join(', ') : '—' },
    { label: 'Color', value: color },
    { label: 'Int/Ext', value: intExt },
    { label: 'Time of Day', value: timeOfDay },
    { label: 'Aspect Ratio', value: aspectRatio },
    { label: 'Frame Size', value: frameSize },
    { label: 'Shot Type', value: shotType },
    { label: 'Composition', value: composition },
    { label: 'Lighting', value: lighting },
    { label: 'Camera', value: camera },
    { label: 'Lenses', value: lenses },
    { label: 'Country', value: country },
  ];

  return (
    <article className="nf-scene-card">
      <div className="nf-scene-media">
        <button
          type="button"
          className="nf-scene-image-btn"
          onClick={() => onExpand?.()}
          aria-label={`View full frame from ${title}`}
        >
          <img src={src} alt={`${title} — ${origin === 'photo' ? 'photograph' : 'AI-generated'} still`} loading="lazy" decoding="async" />
        </button>
        <OriginBadge origin={origin} />
        <div className="nf-scene-toolbar" aria-label="Frame actions">
          <a
            href={src}
            download
            className="nf-scene-tool"
            aria-label="Download frame"
            onClick={(e) => e.stopPropagation()}
          >
            <DownloadIcon />
          </a>
          <button type="button" className="nf-scene-tool nf-scene-tool-soon" disabled title="Coming soon" aria-label="Add to collection (coming soon)">
            <PlusIcon />
          </button>
          <button
            type="button"
            className="nf-scene-tool"
            aria-label="Expand frame"
            onClick={() => onExpand?.()}
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      <ColorPalette colors={palette} variant="scene" />

      <div className="nf-scene-body">
        <h2 className="nf-scene-title">
          <Link href={`/film/gallery/${slug}`}>
            {title} ({year})
          </Link>
        </h2>
        {tags?.length > 0 && (
          <p className="nf-scene-tags">{tags.join(', ')}</p>
        )}

        <dl className="nf-scene-meta">
          {metaRows.map(({ label, value }) => {
            if (!value) return null;
            const href = sceneFacetHref(scene, label);
            return (
              <div key={label} className="nf-scene-meta-item">
                <dt>{label}</dt>
                <dd>
                  {href ? (
                    <Link href={href} className="nf-scene-meta-link">
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </article>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
