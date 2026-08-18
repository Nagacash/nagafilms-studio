'use client';

import { useState } from 'react';
import { GalleryGrid } from './Card';

const TABS = [
  { label: 'All', segment: null, type: null },
  { label: 'Movies', segment: 'movie', type: 'movie' },
  { label: 'Series', segment: 'series', type: 'series' },
  { label: 'Music', segment: 'music-video', type: 'music' },
  { label: 'Commercials', segment: 'commercial', type: 'commercial' },
];

export default function BrowseContent({ items, initialType = null }) {
  const [activeType, setActiveType] = useState(initialType);
  const [list, setList] = useState(false);
  const [visible, setVisible] = useState(12);

  const filtered = activeType ? items.filter((i) => i.type === activeType) : items;
  const shown = filtered.slice(0, visible);

  return (
    <section className="nf-section" id="browse">
      <div className="nf-section-head">
        <div className="nf-section-head-left">
          <h2 className="nf-section-title">Browse Content</h2>
          <span className="nf-section-count">{filtered.length} titles</span>
        </div>
      </div>

      <div className="nf-tabs" role="tablist" aria-label="Browse by category">
        {TABS.map((t) => (
          <a
            key={t.label}
            role="tab"
            aria-selected={activeType === t.type}
            className={`nf-tab${activeType === t.type ? ' is-active' : ''}`}
            href={t.segment ? `/film/${t.segment}` : '/film#browse'}
            onClick={(e) => {
              e.preventDefault();
              setActiveType(t.type);
              setVisible(12);
            }}
          >
            {t.label}
          </a>
        ))}
        <div className="nf-view-toggle" role="group" aria-label="View mode">
          <button
            className={`nf-view-btn${!list ? ' is-active' : ''}`}
            aria-label="Grid view"
            aria-pressed={!list}
            onClick={() => setList(false)}
          >
            <GridIcon />
          </button>
          <button
            className={`nf-view-btn${list ? ' is-active' : ''}`}
            aria-label="Full-width view"
            aria-pressed={list}
            onClick={() => setList(true)}
          >
            <ListIcon />
          </button>
        </div>
      </div>

      <GalleryGrid items={shown} list={list} />

      {visible < filtered.length && (
        <div className="nf-loadmore">
          <button onClick={() => setVisible((v) => v + 12)}>Load more</button>
        </div>
      )}
    </section>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <rect x="3" y="12" width="18" height="5" rx="1" />
      <rect x="3" y="20" width="18" height="1" />
    </svg>
  );
}
