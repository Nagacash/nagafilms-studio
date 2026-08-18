import Link from 'next/link';

export const metadata = { title: 'News — Naga Film' };

export default function NewsPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">News &amp; updates</h1>
      <p className="nf-page-sub">
        What&apos;s new on Naga Film — original cinema drops, library updates, and product notes.
      </p>
      <article className="nf-empty">
        <h3>Naga Film is live</h3>
        <p>
          The gallery launched with original AI-generated cinema from Naga Films Studio.
          Browse titles on <Link href="/film">Home</Link> or explore{' '}
          <Link href="/film/discover">Discover collections</Link>.
        </p>
      </article>

      <section id="faq" className="nf-faq">
        <h2 className="nf-section-title" style={{ marginTop: '2.5rem' }}>
          FAQ
        </h2>
        <dl className="nf-faq-list">
          <div className="nf-faq-item">
            <dt>Are these frames from real movies?</dt>
            <dd>
              No. Every title is an original Naga Films production or freely-licensed reference
              imagery. We never host copyrighted film frames.
            </dd>
          </div>
          <div className="nf-faq-item">
            <dt>How do I generate my own stills?</dt>
            <dd>
              Sign in to <Link href="/studio">Naga Films Studio</Link> and use Image, Video, or
              Cinema Studio. Credit packs are available on the{' '}
              <Link href="/credits">credits page</Link>.
            </dd>
          </div>
          <div className="nf-faq-item">
            <dt>What is Visual Search?</dt>
            <dd>
              Reverse-image search is on the roadmap. See{' '}
              <Link href="/film/labs">Labs</Link> for upcoming features.
            </dd>
          </div>
          <div className="nf-faq-item">
            <dt>How much does Naga Film cost?</dt>
            <dd>
              Browsing is free. Generation happens in the studio — see{' '}
              <Link href="/film/pricing">Pricing</Link> for reference tiers.
            </dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
