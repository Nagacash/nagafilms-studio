import SceneFeed from '@/components/gallery/SceneFeed';
import FilterBar from '@/components/gallery/FilterBar';
import { filterScenes, getAllScenes } from '@/lib/gallery/data';
import { hasActiveFacets, parseFilterParams } from '@/lib/gallery/facets';

export const metadata = { title: 'Filter — Naga Film' };

export default function FilterPage({ searchParams }) {
  const params = parseFilterParams(searchParams);
  const catalogScenes = getAllScenes();
  const scenes = filterScenes(searchParams);
  const filtered = hasActiveFacets(params) || Boolean(params.search);

  let heading = 'Movie scenes';
  if (params.search) heading = `Results for “${params.search}”`;
  else if (hasActiveFacets(params)) heading = 'Filtered scenes';

  return (
    <section className="nf-section nf-filter-section">
      <div className="nf-section-head">
        <div className="nf-section-head-left">
          <h2 className="nf-section-title">{heading}</h2>
          <span className="nf-section-count">{scenes.length} frames</span>
        </div>
      </div>

      <FilterBar params={params} catalogScenes={catalogScenes} />

      <p className="nf-filter-hint">
        Search naturally — e.g. “neon rain alley”, “subway silhouette”, “product rim light”.
        Or use the chips to browse by frame size, shot type, color, and setting.
      </p>

      {scenes.length === 0 ? (
        <p className="nf-filter-empty" role="status">
          No frames match{filtered ? ' these filters' : ''}.
          {' '}
          Try clearing a chip or searching a broader term.
        </p>
      ) : (
        <SceneFeed scenes={scenes} />
      )}
    </section>
  );
}
