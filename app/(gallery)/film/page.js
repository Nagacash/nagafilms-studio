import Link from 'next/link';
import HeroCarousel from '@/components/gallery/HeroCarousel';
import BrowseContent from '@/components/gallery/BrowseContent';
import OriginBadge from '@/components/gallery/OriginBadge';
import { GalleryGrid } from '@/components/gallery/Card';
import { getAll, projects, heroSlides } from '@/lib/gallery/data';

export const metadata = {
  title: 'Naga Film — AI cinema stills and shot references',
  description:
    'Original AI-generated cinema stills for shot reference. Not frames from other people’s films.',
};

export default function GalleryHome() {
  const items = getAll();

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      <section className="nf-section">
        <div className="nf-section-head">
          <div className="nf-section-head-left">
            <h2 className="nf-section-title">From the studio</h2>
            <span className="nf-section-count">{projects.length} sets</span>
          </div>
          <Link href="/film/discover" className="nf-section-link">View All →</Link>
        </div>
        <div className="nf-showcase-row">
          {projects.map((p) => (
            <Link key={p.id} href={p.link} className="nf-card nf-showcase-card">
              <div className="nf-card-media">
                <span className="nf-card-badge">{p.typeLabel}</span>
                <OriginBadge origin={p.origin} />
                <img src={p.thumbUrl} alt={`${p.title} — AI-generated still`} loading="lazy" decoding="async" />
                <div className="nf-card-overlay" />
                <div className="nf-card-body">
                  <h3 className="nf-card-title">{p.title} ({p.year})</h3>
                  <div className="nf-card-meta">
                    <span>{p.frameCount} stills</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <BrowseContent items={items} />
    </>
  );
}
