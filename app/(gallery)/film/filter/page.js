import SceneFeed from '@/components/gallery/SceneFeed';
import { searchScenes, getAllScenes } from '@/lib/gallery/data';

export const metadata = { title: 'Filter — Naga Film' };

export default function FilterPage({ searchParams }) {
  const q = searchParams?.search || '';
  const scenes = q ? searchScenes(q) : getAllScenes();

  return (
    <section className="nf-section nf-filter-section">
      <div className="nf-section-head">
        <div className="nf-section-head-left">
          <h2 className="nf-section-title">
            {q ? `Results for “${q}”` : 'Movie scenes'}
          </h2>
          <span className="nf-section-count">{scenes.length} frames</span>
        </div>
      </div>
      <p className="nf-filter-hint">
        Search naturally — e.g. “neon rain alley”, “subway silhouette”, “product rim light”.
        Each frame includes color picks and cinematography references.
      </p>
      <SceneFeed scenes={scenes} />
    </section>
  );
}
