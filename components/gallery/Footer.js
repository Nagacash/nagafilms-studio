import Link from 'next/link';

const EXPLORE = [
  { label: 'Home', href: '/film' },
  { label: 'Filter', href: '/film/filter' },
  { label: 'Movies', href: '/film/movie' },
  { label: 'Series', href: '/film/series' },
  { label: 'Music Videos', href: '/film/music-video' },
  { label: 'Commercials', href: '/film/commercial' },
];

const COMPANY = [
  { label: 'About', href: '/film/news' },
  { label: 'Guide', href: '/film/news' },
  { label: 'FAQ', href: '/film/pricing' },
  { label: 'Contact', href: '/film/contact' },
  { label: 'Pricing', href: '/film/pricing' },
  { label: 'For Rights Holders', href: '/film/contact' },
];

const LEGAL = [
  { label: 'Terms Of Use', href: '/policy' },
  { label: 'Privacy Policy', href: '/policy' },
  { label: 'Impressum', href: '/impressum' },
  { label: 'AI Act notice', href: '/policy' },
];

export default function GalleryFooter() {
  return (
    <footer className="nf-footer">
      <div className="nf-footer-inner">
        <div className="nf-footer-top">
          <div className="nf-footer-brand">
            <Link href="/" className="nf-logo" aria-label="Naga Film home">
              Naga<span style={{ color: 'var(--nf-gold)' }}>Film</span>
            </Link>
            <p>Movie stills, film frames &amp; TV screenshots for filmmakers — original AI cinema and freely-licensed imagery only.</p>
            <div className="nf-footer-connect">
              <a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
            </div>
          </div>

          <div className="nf-footer-cols">
            <div className="nf-footer-col">
              <h3>Explore</h3>
              <ul>
                {EXPLORE.map((l) => (
                  <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="nf-footer-col">
              <h3>Company</h3>
              <ul>
                {COMPANY.map((l) => (
                  <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="nf-footer-col">
              <h3>Legal</h3>
              <ul>
                {LEGAL.map((l) => (
                  <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="nf-footer-bottom">
          © {new Date().getFullYear()} Naga Film · Hamburg · A Naga Films Studio surface. Built on Open Generative AI · MIT.
        </div>
      </div>
    </footer>
  );
}
