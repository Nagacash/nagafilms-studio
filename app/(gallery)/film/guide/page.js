import Link from 'next/link';

export const metadata = { title: 'Guide — Naga Film' };

export default function GuidePage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">How to use Naga Film</h1>
      <p className="nf-page-sub">
        A quick guide for browsing original AI cinema references — inspired by{' '}
        <a href="https://stillslab.com/" target="_blank" rel="noopener noreferrer">
          StillsLab
        </a>
        , built for Naga Films Studio.
      </p>

      <div className="nf-guide-steps">
        <article className="nf-collection-card">
          <div className="nf-collection-body">
            <span className="nf-collection-tag">01</span>
            <h3 className="nf-collection-title">Browse by category</h3>
            <p className="nf-page-sub" style={{ marginTop: '0.5rem' }}>
              Start on <Link href="/film">Home</Link>, or jump to{' '}
              <Link href="/film/movie">Movies</Link>,{' '}
              <Link href="/film/series">Series</Link>,{' '}
              <Link href="/film/music-video">Music Videos</Link>, or{' '}
              <Link href="/film/commercial">Commercials</Link>.
            </p>
          </div>
        </article>

        <article className="nf-collection-card">
          <div className="nf-collection-body">
            <span className="nf-collection-tag">02</span>
            <h3 className="nf-collection-title">Open a title</h3>
            <p className="nf-page-sub" style={{ marginTop: '0.5rem' }}>
              Each title has a detail page with credits, synopsis, and a frame grid.
              Click any frame to open the lightbox — arrow keys and Escape work.
            </p>
          </div>
        </article>

        <article className="nf-collection-card">
          <div className="nf-collection-body">
            <span className="nf-collection-tag">03</span>
            <h3 className="nf-collection-title">Discover collections</h3>
            <p className="nf-page-sub" style={{ marginTop: '0.5rem' }}>
              Curated mood boards live on{' '}
              <Link href="/film/discover">Discover</Link>. Filter with{' '}
              <Link href="/film/filter">Filter</Link> or search from the header.
            </p>
          </div>
        </article>

        <article className="nf-collection-card">
          <div className="nf-collection-body">
            <span className="nf-collection-tag">04</span>
            <h3 className="nf-collection-title">Generate your own</h3>
            <p className="nf-page-sub" style={{ marginTop: '0.5rem' }}>
              Every frame here is original AI cinema from{' '}
              <Link href="/studio">Naga Films Studio</Link> — create your own stills
              and clips with the same tools.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
