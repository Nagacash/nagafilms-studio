import { GalleryGrid } from '../../../components/gallery/Card';
import { search, getAll } from '../../../lib/gallery/data';

export const metadata = { title: 'Filter — Naga Film' };

export default function FilterPage({ searchParams }) {
  const q = searchParams?.search || '';
  const results = q ? search(q) : getAll();

  return (
    <section className="nf-section">
      <div className="nf-section-head">
        <div className="nf-section-head-left">
          <h2 className="nf-section-title">{q ? `Results for “${q}”` : 'All content'}</h2>
          <span className="nf-section-count">{results.length} titles</span>
        </div>
      </div>
      <GalleryGrid items={results} />
    </section>
  );
}
