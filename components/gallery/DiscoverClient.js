'use client';

import { useState } from 'react';
import { getCollectionsByTab } from '../../../lib/gallery/data';

const TABS = ['Trending', 'Featured', 'New', 'Most Liked'];

export default function DiscoverClient({ collections }) {
  const [tab, setTab] = useState('Featured');
  const shown = getCollectionsByTab(tab);

  return (
    <>
      <div className="nf-collection-tabs" role="tablist" aria-label="Discover tabs">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`nf-tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="nf-grid">
        {shown.map((c) => (
          <div key={c.id} className="nf-collection-card">
            <div className="nf-collection-media">
              <img src={c.thumb} alt={c.title} loading="lazy" decoding="async" />
            </div>
            <div className="nf-collection-body">
              <span className="nf-collection-tag">{c.tab}</span>
              <h3 className="nf-collection-title">{c.title}</h3>
              <div className="nf-collection-meta">
                <span>by {c.creator}</span>
                <span>·</span>
                <span>{c.stills} stills</span>
                <span>·</span>
                <span>{c.likes} likes</span>
                <span>·</span>
                <span>{c.followers} followers</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
