import Link from 'next/link';
import {
  filterHref,
  getPresentFacetGroups,
  hasActiveFacets,
  toggleFacetHref,
} from '@/lib/gallery/facets';

export default function FilterBar({ params, catalogScenes }) {
  const groups = getPresentFacetGroups(catalogScenes);
  if (!groups.length) return null;

  const clearHref = filterHref({ search: params.search });

  return (
    <div className="nf-facet-bar">
      {groups.map((group) => (
        <div key={group.key} className="nf-facet-row">
          <span className="nf-facet-label">{group.label}</span>
          <div className="nf-facet-chips" role="group" aria-label={group.label}>
            {group.options.map((option) => {
              const active = params[group.key] === option.value;
              return (
                <Link
                  key={option.value}
                  href={toggleFacetHref(params, group.key, option.value)}
                  className={`nf-chip${active ? ' is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  scroll={false}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {hasActiveFacets(params) && (
        <div className="nf-facet-clear">
          <Link href={clearHref} scroll={false}>Clear filters</Link>
        </div>
      )}
    </div>
  );
}
