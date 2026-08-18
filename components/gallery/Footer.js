import Link from 'next/link';

const EXPLORE = [
  { label: 'Home', href: '/' },
  { label: 'Filter', href: '/filter' },
  { label: 'Movies', href: '/movie' },
  { label: 'Series', href: '/series' },
  { label: 'Music Videos', href: '/music-video' },
  { label: 'Commercials', href: '/commercial' },
];

const COMPANY = [
  { label: 'About', href: '/news' },
  { label: 'Guide', href: '/news' },
  { label: 'FAQ', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'For Rights Holders', href: '/contact' },
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
