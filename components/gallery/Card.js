import Link from 'next/link';

const TYPE_LABEL = {
  movie: 'Movies',
  series: 'Series',
  music: 'Music Video',
  commercial: 'Commercial',
};

export default function GalleryCard({ item }) {
  return (
    <Link href={item.link || `/gallery/${item.slug}`} className="nf-card">
      <div className="nf-card-media">
        <span className="nf-card-badge">{TYPE_LABEL[item.type] || item.typeLabel || 'Film'}</span>
        <img
          src={item.thumbUrl}
          alt={item.title}
          loading="lazy"
          decoding="async"
        />
        <div className="nf-card-overlay" />
        <div className="nf-card-body">
          <h3 className="nf-card-title">{item.title}</h3>
          <div className="nf-card-meta">
            <span>{item.year}</span>
            <span className="dot">·</span>
            <span>{item.imageCount ?? item.frameCount ?? 0} stills</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GalleryGrid({ items, list = false }) {
  if (!items || items.length === 0) {
    return (
      <div className="nf-empty">
        <h3>No frames here yet</h3>
        <p>Try another category, or come back soon — new original cinema is added regularly.</p>
      </div>
    );
  }
  return (
    <div className={`nf-grid${list ? ' is-list' : ''}`}>
      {items.map((it) => (
        <GalleryCard key={it.id || it.slug} item={it} />
      ))}
    </div>
  );
}
