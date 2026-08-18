import LegalShell from '@/components/LegalShell';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use — Naga Films Studio',
  description: 'Terms of use and acceptable-use rules for Naga Films Studio, including AI-generated media and deepfake disclosure.',
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <p className="text-white/45">
        Last updated: 18 August 2026. These terms govern Naga Films Studio and the Naga Film gallery
        (together, the “Service”). They sit next to the{' '}
        <Link href="/policy">Privacy Policy</Link> and the{' '}
        <Link href="/policy#eu-ai-act">EU AI Act notice</Link>. By creating an account or using the
        Service, you agree to them.
      </p>

      <section>
        <h2>1. Who we are</h2>
        <p className="mt-3">
          The Service is operated by Maurice Holda, Bei Schuldts Stift 2, 20355 Hamburg, Germany
          (Kleinstunternehmer). Contact:{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>. See also the{' '}
          <Link href="/impressum">Impressum</Link>.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p className="mt-3">
          Naga Films Studio is a pay-as-you-go generation tool. Image, video, cinema, lip-sync,
          marketing, and storyboard outputs are produced by third-party AI models (via our operator
          integration). Credit packs buy usage; there is no subscription.
        </p>
        <p className="mt-3">
          The public gallery at /film shows original stills for reference. Titles there are Naga
          productions, not frames from other people’s films.
        </p>
      </section>

      <section>
        <h2>3. AI-generated content</h2>
        <p className="mt-3">
          Studio outputs are artificially generated or manipulated by AI. They are not a human-captured
          photograph or recording unless you supplied one as an input and the model left it
          substantially unaltered.
        </p>
        <p className="mt-3">
          We label Studio results and AI stills in the gallery as AI-generated. Machine-readable marks
          (watermarks, C2PA) depend on what upstream providers attach; we do not strip those marks,
          and we do not offer a watermark-removal tool.
        </p>
      </section>

      <section>
        <h2>4. Deepfakes and publishing</h2>
        <p className="mt-3">
          Lip-sync, talking avatars, and face-driven video can depict a real person appearing to say
          or do something they did not. Under the EU AI Act, if you publish that kind of content you
          must disclose that it was artificially generated or manipulated, unless a legal exemption
          applies (for example certain artistic or satirical uses that still carry an appropriate
          disclosure).
        </p>
        <p className="mt-3">That duty is yours when you post, send, or otherwise make the file public.</p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p className="mt-3">You may not use the Service to:</p>
        <ul className="mt-3">
          <li>
            Create or share non-consensual sexual or intimate imagery of a real person, or any
            deepfake of a real person without a lawful basis (including consent where required).
          </li>
          <li>Impersonate a real person in order to deceive, defraud, or cause harm.</li>
          <li>
            Use the Service as a high-risk AI system under Annex III of the EU AI Act (for example
            employment decisions, credit scoring, law enforcement, or biometric identification as a
            product).
          </li>
          <li>Attempt to remove, hide, or defeat AI-origin marks on generated media.</li>
          <li>Violate criminal law, personality rights, copyright, or data-protection law.</li>
        </ul>
      </section>

      <section>
        <h2>6. Accounts, credits, outputs</h2>
        <p className="mt-3">
          You are responsible for your prompts, uploads, and what you do with outputs. Failed
          generations restore app credits. Pack purchases are one-time; we do not refund unused pack
          balance once payment succeeds. Upstream model providers may have their own licence terms
          for commercial use of outputs — check those if you need them.
        </p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p className="mt-3">
          The Service is not directed at children under 16. Do not create an account for a child.
        </p>
      </section>

      <section>
        <h2>8. Changes and contact</h2>
        <p className="mt-3">
          We may update these terms when the Service or the law changes. The date above will move.
          Questions:{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>.
        </p>
      </section>
    </LegalShell>
  );
}
