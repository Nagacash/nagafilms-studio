import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBySlug, getAll, typeToSegment } from '@/lib/gallery/data';
import FrameGrid from '@/components/gallery/FrameGrid';

export function generateStaticParams() {
  return getAll().map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }) {
  const item = getBySlug(params.slug);
  if (!item) return { title: 'Not found — Naga Film' };
  return {
    title: `${item.title} (${item.year}) — Naga Film`,
    description: item.synopsis
      ? `${item.synopsis.slice(0, 150)}…`
      : `${item.title} frames — ${item.imageCount} stills.`,
  };
}

export default function GalleryDetail({ params }) {
  const item = getBySlug(params.slug);
  if (!item) notFound();

  const catSegment = typeToSegment(item.type);
  const frames = item.stills && item.stills.length > 0 ? item.stills : [item.thumbUrl];

  return (
    <>
      <header className="nf-detail-header">
        <img className="nf-detail-backdrop" src={item.thumbUrl} alt="" aria-hidden="true" />
        <div className="nf-detail-backdrop-grad" />
        <div className="nf-detail-inner">
          <div>
            <div className="nf-breadcrumb">
              <Link href={`/film/${catSegment}`}>{breadcrumbLabel(item.type)}</Link>
              <span> / </span>
              <span>{item.title}</span>
            </div>
            <h1 className="nf-detail-title">{item.title}</h1>
            <div className="nf-detail-meta">
              <span>{item.year}</span>
              {item.country && <><span className="dot">•</span><span>{item.country}</span></>}
              {item.genres && item.genres.length > 0 && <><span className="dot">•</span><span>{item.genres.join(', ')}</span></>}
              <span className="nf-imdb">IMDb</span>
              <span className="dot">•</span>
              <span>{item.imageCount} frames</span>
            </div>
            {item.synopsis && <p className="nf-detail-synopsis">{item.synopsis}</p>}
          </div>

          <div>
            <div className="nf-detail-credits">
              {item.director && (
                <div>
                  <div className="nf-credit-label">Director</div>
                  <div className="nf-credit-value">{item.director}</div>
                </div>
              )}
              {item.cinematographer && (
                <div>
                  <div className="nf-credit-label">Cinematographer</div>
                  <div className="nf-credit-value">{item.cinematographer}</div>
                </div>
              )}
              {item.runtime && (
                <div>
                  <div className="nf-credit-label">Runtime</div>
                  <div className="nf-credit-value">{item.runtime}</div>
                </div>
              )}
            </div>
            <div className="nf-detail-actions">
              <button className="nf-btn nf-btn-outline">
                <HeartIcon /> Favorite
              </button>
              <button className="nf-btn nf-btn-outline">
                <ClockIcon /> Watch Later
              </button>
            </div>
          </div>
        </div>
      </header>

      <FrameGrid frames={frames} alt={item.title} />
    </>
  );
}

function breadcrumbLabel(type) {
  if (type === 'movie') return 'Movies';
  if (type === 'series') return 'Series';
  if (type === 'music') return 'Music Videos';
  if (type === 'commercial') return 'Commercials';
  return 'Browse';
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>;
}
