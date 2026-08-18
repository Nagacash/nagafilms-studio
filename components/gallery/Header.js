import Link from 'next/link';

const NAV = [
  { label: 'Filter', href: '/film/filter' },
  { label: 'Visual Search', href: '/film/visual-search' },
  { label: 'Discover', href: '/film/discover' },
  { label: 'News', href: '/film/news' },
  { label: 'Labs', href: '/film/labs' },
  { label: 'Pricing', href: '/film/pricing' },
  { label: 'Contact', href: '/film/contact' },
];

export default function GalleryHeader({ activeHref }) {
  return (
    <header className="nf-header">
      <div className="nf-header-inner">
        <Link href="/film" className="nf-logo" aria-label="Naga Film home">
          Naga<span>Film</span>
        </Link>

        <nav className="nf-nav" aria-label="Gallery">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={activeHref === n.href ? 'is-active' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="nf-header-right">
          <form className="nf-search" action="/filter" method="get" role="search">
            <SearchIcon />
            <input
              type="search"
              name="search"
              placeholder="Search frames, movies, people..."
              aria-label="Search frames, movies, people"
            />
          </form>
          <Link href="/contact" className="nf-btn nf-btn-outline">+ Request</Link>
          <Link href="/login" className="nf-icon-btn" aria-label="Sign in">
            <SignInIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
