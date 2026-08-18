export const metadata = { title: 'Contact — Naga Film' };

export default function ContactPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">Contact &amp; requests</h1>
      <p className="nf-page-sub">
        Request a title, report an issue, or talk about rights-holder submissions. Naga Film only hosts original AI-generated cinema and freely-licensed CC0 imagery — we do not host copyrighted film frames.
      </p>
      <div className="nf-collection-card" style={{ maxWidth: 560 }}>
        <div className="nf-collection-body">
          <h3 className="nf-collection-title">Request a title</h3>
          <form action="/contact" method="post" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
            <input className="nf-search" style={{ background: 'var(--nf-surface-1)', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--nf-border)', color: 'var(--nf-text)' }} name="title" placeholder="Title or artist" />
            <input className="nf-search" style={{ background: 'var(--nf-surface-1)', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--nf-border)', color: 'var(--nf-text)' }} name="email" type="email" placeholder="Your email" />
            <textarea style={{ background: 'var(--nf-surface-1)', padding: '0.7rem 0.9rem', borderRadius: 8, border: '1px solid var(--nf-border)', color: 'var(--nf-text)', fontFamily: 'var(--nf-sans)', minHeight: 96 }} name="note" placeholder="What are you looking for?" />
            <button type="submit" className="nf-btn nf-btn-gold" style={{ alignSelf: 'flex-start' }}>Send request</button>
          </form>
          <p style={{ fontSize: '0.75rem', color: 'var(--nf-muted-2)', marginTop: '1rem' }}>
            Or email the studio directly — see Naga Films Studio for generation and production enquiries.
          </p>
        </div>
      </div>
    </section>
  );
}
