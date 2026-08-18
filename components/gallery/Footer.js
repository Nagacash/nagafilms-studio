import Link from 'next/link';
import BrandMark from '@/components/gallery/BrandMark';

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
  { label: 'Guide', href: '/film/guide' },
  { label: 'FAQ', href: '/film/news#faq' },
  { label: 'Studio', href: '/studio' },
  { label: 'Landing', href: '/' },
  { label: 'Buy credits', href: '/credits' },
  { label: 'Contact', href: '/film/contact' },
  { label: 'Pricing', href: '/film/pricing' },
];

const LEGAL = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/policy' },
  { label: 'Impressum', href: '/impressum' },
  { label: 'AI Act notice', href: '/policy#eu-ai-act' },
];

export default function GalleryFooter() {
  return (
    <footer className="nf-footer">
      <div className="nf-footer-inner">
        <div className="nf-footer-top">
          <div className="nf-footer-brand">
            <BrandMark href="/film" className="nf-brand-footer" />
            <p>
              AI-generated cinema stills for shot reference — original work from{' '}
              <Link href="/">Naga Films Studio</Link>. Not frames from other people&apos;s films.
            </p>
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
          <p>© {new Date().getFullYear()} Naga Films · Hamburg</p>
          <p>
            Official brand:{' '}
            <a href="https://nagaclub.de" target="_blank" rel="noreferrer">Naga Apparel</a>
            {' · '}
            Designed by{' '}
            <a href="https://nagacodex.cloud" target="_blank" rel="noreferrer">Naga Codex</a>
          </p>
          <p className="nf-footer-note">
            Gallery stills marked AI-generated are synthetic. Disclose deepfakes when you publish.{' '}
            <Link href="/terms">Terms</Link>
            {' · '}
            Built on{' '}
            <a href="https://github.com/Anil-matcha/Open-Generative-AI" target="_blank" rel="noreferrer">
              Open Generative AI
            </a>
            {' · '}
            MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
