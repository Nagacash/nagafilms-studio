export const metadata = { title: 'Labs — Naga Film' };

export default function LabsPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">Labs</h1>
      <p className="nf-page-sub">
        Experimental surfaces from Naga Film — visual search, frame comparison, and automated shotlist tooling. Live when ready.
      </p>
      <div className="nf-empty">
        <h3>Nothing in the lab yet</h3>
        <p>Visual Search and frame-compare are queued. Watch this space.</p>
      </div>
    </section>
  );
}
