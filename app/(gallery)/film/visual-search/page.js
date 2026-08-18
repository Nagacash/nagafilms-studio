export const metadata = { title: 'Visual Search — Naga Film' };

export default function VisualSearchPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">Visual Search</h1>
      <p className="nf-page-sub">
        Search frames by image — upload a reference and find visually similar stills across the Naga Film library.
        This surface is in the labs and will light up once the embedding index is built.
      </p>
      <div className="nf-empty">
        <h3>Coming soon</h3>
        <p>Visual (reverse-image) search is in development. Until then, use Filter for text search.</p>
      </div>
    </section>
  );
}
