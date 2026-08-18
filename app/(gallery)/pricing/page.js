export const metadata = { title: 'Pricing — Naga Film' };

const PACKS = [
  { name: 'Free', price: '€0', blurb: 'Browse the full gallery, all categories, all detail pages.', features: ['Unlimited browsing', 'Frame lightbox', 'No account required'] },
  { name: 'Studio', price: '€9', blurb: 'Credit pack for Naga Films Studio — generate your own frames.', features: ['500 generation credits', 'Never expires', 'Failed jobs restore credits'] },
  { name: 'Pro', price: '€59', blurb: 'Volume pack for production days and library builds.', features: ['5,000 generation credits', 'Priority model access', 'Never expires'] },
];

export default function PricingPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">Pricing</h1>
      <p className="nf-page-sub">
        Browsing Naga Film is free. Generation happens in Naga Films Studio with one-time credit packs — no subscription.
      </p>
      <div className="nf-grid">
        {PACKS.map((p) => (
          <div key={p.name} className="nf-collection-card">
            <div className="nf-collection-body">
              <h3 className="nf-collection-title">{p.name}</h3>
              <div className="nf-credit-value" style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.75rem' }}>{p.price}</div>
              <p style={{ color: 'var(--nf-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>{p.blurb}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: '0.83rem', color: 'var(--nf-muted)' }}>✓ {f}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
