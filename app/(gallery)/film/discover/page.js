import DiscoverClient from '@/components/gallery/DiscoverClient';
import { collections } from '@/lib/gallery/data';

export const metadata = { title: 'Discover Collections — Naga Film' };

export default function DiscoverPage() {
  return (
    <section className="nf-section">
      <div className="nf-section-head">
        <div className="nf-section-head-left">
          <h2 className="nf-section-title">Discover Collections</h2>
          <span className="nf-section-count">{collections.length} collections</span>
        </div>
      </div>
      <DiscoverClient collections={collections} />
    </section>
  );
}
