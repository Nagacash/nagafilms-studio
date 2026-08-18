import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollectionBySlug, getAllCollections } from '@/lib/gallery/data';
import FrameGrid from '@/components/gallery/FrameGrid';

export function generateStaticParams() {
  return getAllCollections().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const col = getCollectionBySlug(params.slug);
  if (!col) return { title: 'Not found — Naga Film' };
  return {
    title: `${col.title} — Discover — Naga Film`,
    description: `Curated collection by ${col.creator}. ${col.stills} stills.`,
  };
}

export default function CollectionPage({ params }) {
  const col = getCollectionBySlug(params.slug);
  if (!col) notFound();

  return (
    <>
      <header className="nf-detail-header nf-collection-header">
        <img className="nf-detail-backdrop" src={col.thumb} alt="" aria-hidden="true" />
        <div className="nf-detail-backdrop-grad" />
        <div className="nf-detail-inner">
          <div>
            <div className="nf-breadcrumb">
              <Link href="/film/discover">Discover</Link>
              <span> / </span>
              <span>{col.title}</span>
            </div>
            <h1 className="nf-detail-title">{col.title}</h1>
            <div className="nf-detail-meta">
              <span>by {col.creator}</span>
              <span className="dot">•</span>
              <span>{col.stills} stills</span>
              <span className="dot">•</span>
              <span>{col.likes} likes</span>
              <span className="dot">•</span>
              <span>{col.followers} followers</span>
            </div>
            {col.description && (
              <p className="nf-detail-synopsis">{col.description}</p>
            )}
          </div>
        </div>
      </header>

      <FrameGrid frames={col.frames} alt={col.title} />
    </>
  );
}
