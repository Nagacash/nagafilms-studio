export const metadata = { title: 'News — Naga Film' };

export default function NewsPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">News &amp; updates</h1>
      <p className="nf-page-sub">
        What's new on Naga Film — new original cinema drops, library updates, and product notes.
      </p>
      <article className="nf-empty">
        <h3>Naga Film is live</h3>
        <p>The gallery launched with original AI-generated cinema from Naga Films Studio plus freely-licensed CC0 references. More titles land weekly.</p>
      </article>
    </section>
  );
}
