import Link from 'next/link';
import ContactForm from '@/components/gallery/ContactForm';

export const metadata = { title: 'Contact — Naga Film' };

export default function ContactPage() {
  return (
    <section className="nf-page">
      <h1 className="nf-page-title">Contact &amp; requests</h1>
      <p className="nf-page-sub">
        Request a title, report an issue, or talk about rights-holder submissions. Naga Film
        only hosts original AI-generated cinema — we do not host copyrighted film frames.
      </p>
      <div className="nf-collection-card nf-contact-card">
        <div className="nf-collection-body">
          <h3 className="nf-collection-title">Request a title</h3>
          <ContactForm />
          <p className="nf-contact-note">
            Or open{' '}
            <Link href="/studio">Naga Films Studio</Link> to generate your own references.
          </p>
        </div>
      </div>
    </section>
  );
}
