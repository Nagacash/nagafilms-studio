import LegalShell from '@/components/LegalShell';

export const metadata = {
  title: 'Privacy Policy — Naga Films Studio',
  description:
    'Privacy, GDPR, and EU AI Act transparency for Naga Films Studio (OWASP-aligned practices).',
};

export default function PolicyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p className="text-white/45">
        Last updated: 12 August 2026. This notice describes how personal data is handled when you use
        Naga Films Studio (the “Service”), and how we disclose AI use under the EU Artificial
        Intelligence Act. It follows GDPR transparency rules and security expectations aligned with
        OWASP guidance (minimize data, protect credentials, limit processors, and avoid unnecessary
        retention or disclosure).
      </p>

      <section>
        <h2>1. Controller</h2>
        <p className="mt-3">
          Maurice Holda
          <br />
          Bei Schuldts Stift 2
          <br />
          20355 Hamburg, Germany
          <br />
          Email:{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>
        </p>
        <p className="mt-3">
          This is a small sole-trader operation (Kleinstunternehmer), not a registered GmbH/UG. No
          separate data protection officer is appointed. For privacy requests, contact the email above.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <p className="mt-3">We only collect data needed to run the Service:</p>
        <ul className="mt-3">
          <li>
            <strong>Account data</strong> — email address; password stored only as a one-way hash
            (never plaintext); optional name if provided via OAuth.
          </li>
          <li>
            <strong>Session data</strong> — authentication session / JWT cookies (httpOnly where
            applicable) to keep you signed in.
          </li>
          <li>
            <strong>Credits &amp; billing metadata</strong> — wallet balance, credit transactions,
            and Stripe checkout / payment references. We do not store full card numbers; Stripe
            processes payments.
          </li>
          <li>
            <strong>Generation activity</strong> — prompts, parameters, status, and resulting media
            URLs or job IDs needed to fulfill generation requests and credit accounting.
          </li>
          <li>
            <strong>Technical logs</strong> — short-lived server logs (e.g. errors, request timing).
            We do not intentionally log passwords, API keys, or full payment payloads.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Why we process data (purposes &amp; legal bases)</h2>
        <ul className="mt-3">
          <li>
            <strong>Provide the Service</strong> (Art. 6(1)(b) GDPR) — create accounts, authenticate
            you, run generations, manage credit packs, and show balances.
          </li>
          <li>
            <strong>Payments</strong> (Art. 6(1)(b)) — process one-time credit pack purchases via
            Stripe.
          </li>
          <li>
            <strong>Security &amp; abuse prevention</strong> (Art. 6(1)(f)) — protect accounts,
            detect fraud or misuse, and keep the platform available (OWASP: spoofing, tampering,
            elevation of privilege).
          </li>
          <li>
            <strong>Legal obligations</strong> (Art. 6(1)(c)) — retain limited records where
            bookkeeping or tax rules require it.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Processors &amp; third parties</h2>
        <p className="mt-3">
          We use subprocessors only to operate the Service. They receive the minimum data required:
        </p>
        <ul className="mt-3">
          <li>
            <strong>Neon</strong> — PostgreSQL hosting for accounts, sessions, wallets, and
            generation records.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing for credit packs. Card data is handled by
            Stripe under their terms; we store payment status and related IDs, not PAN/CVC.
          </li>
          <li>
            <strong>MuAPI (and underlying model providers)</strong> — generation requests (prompts /
            media inputs) are sent server-side using our operator API key so the Service can produce
            outputs. Do not submit secrets or unnecessary personal data in prompts.
          </li>
          <li>
            <strong>Optional OAuth providers</strong> (Google / GitHub, if enabled) — account email /
            profile fields they return when you choose to sign in that way.
          </li>
          <li>
            <strong>Hosting</strong> — the app may be deployed on infrastructure such as Vercel;
            request metadata is processed as part of delivery.
          </li>
        </ul>
        <p className="mt-3">
          Server secrets (e.g. <code className="text-white/55">MUAPI_API_KEY</code>, Stripe secret
          keys, database URL) stay on the server and are not exposed to the browser.
        </p>
      </section>

      <section>
        <h2>5. Cookies &amp; similar technology</h2>
        <p className="mt-3">
          We use essential cookies / storage for authentication and session continuity. We do not use
          advertising trackers or third-party marketing pixels on the core Studio surfaces. You can
          clear cookies in your browser; doing so will sign you out.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <ul className="mt-3">
          <li>Account and wallet data — while your account exists, then deleted or anonymized on request where legally possible.</li>
          <li>Payment-related records — as long as required for accounting / dispute handling.</li>
          <li>
            Studio gallery (Image, Video, Lip Sync, Cinema, Marketing) —{' '}
            <strong>not stored on our servers</strong>; history is kept in your browser&apos;s local
            storage only. Download files you want to keep.
          </li>
          <li>Storyboard projects — held with our generation provider while the project exists; deleted when you remove the project.</li>
          <li>Security logs — short retention for operations and abuse investigation.</li>
        </ul>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p className="mt-3">
          Some processors may process data outside the EEA (for example US-based payment or hosting
          providers). Where that occurs, we rely on appropriate safeguards such as the provider’s
          standard contractual clauses or equivalent mechanisms described in their privacy
          documentation.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p className="mt-3">Under the GDPR you may request:</p>
        <ul className="mt-3">
          <li>Access to your personal data</li>
          <li>Rectification of inaccurate data</li>
          <li>Erasure (“right to be forgotten”), subject to legal retention</li>
          <li>Restriction of or objection to certain processing</li>
          <li>Data portability for data you provided</li>
          <li>Complaint to a supervisory authority (in Germany, typically your state data protection authority or the BfDI)</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, email{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>. We may need
          to verify your identity before acting on a request.
        </p>
      </section>

      <section>
        <h2 id="eu-ai-act">9. EU AI Act transparency</h2>
        <p className="mt-3">
          Naga Films Studio is a generative production tool. Image, video, cinema, and lip-sync
          outputs are produced by AI systems (third-party models accessed via our operator
          integration). We act as a <strong>deployer</strong> of those generative systems toward end
          users of the Service, and as the operator of the Studio application offered in the EU.
        </p>
        <h3>What this means for you</h3>
        <ul className="mt-3">
          <li>
            <strong>AI-generated content</strong> — Content you create in the Studio is
            artificially generated or manipulated by AI. It is not a human-captured photograph or
            recording unless you separately supply one as an input.
          </li>
          <li>
            <strong>No chatbot impersonation</strong> — The Studio is an authoring tool. We do not
            operate a system that pretends to be a human in conversation with the public.
          </li>
          <li>
            <strong>Deepfakes &amp; publishing</strong> — If you publish or share image, audio, or
            video that depicts real persons in a way that could constitute a deepfake, EU law may
            require <em>you</em> (as publisher/deployer of that content) to disclose that it was
            artificially generated or manipulated, except where a legal exemption applies (for
            example certain artistic/satirical contexts with appropriate disclosure).
          </li>
          <li>
            <strong>Public-interest text</strong> — If you use AI-generated text to inform the public
            on matters of public interest, disclose that it is AI-generated unless it has undergone
            human review and editorial responsibility.
          </li>
          <li>
            <strong>Machine-readable marking</strong> — Article 50(2) requires providers of systems
            that generate synthetic audio, image, video, or text to mark outputs in a
            machine-readable way where technically feasible. Upstream model providers and our
            generation pipeline are evolving toward these marks. Where a provider supplies
            watermarks, C2PA/manifests, or similar signals, we aim to preserve them; full coverage
            across every model is not guaranteed today. Obligations apply from{' '}
            <strong>2 August 2026</strong>, with a limited grace period to{' '}
            <strong>2 December 2026</strong> for certain marking duties on systems already on the
            market before that date.
          </li>
          <li>
            <strong>Risk posture</strong> — The hosted Studio is intended for creative / production
            use. It is not offered as a prohibited AI practice under Article 5, and it is not
            marketed as a high-risk AI system under Annex III (e.g. employment, law enforcement,
            critical infrastructure). If your use case would classify as high-risk, you must not use
            the Service for that purpose without your own conformity assessment and legal review.
          </li>
        </ul>
        <p className="mt-3">
          Contact for AI transparency questions:{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>.
        </p>
      </section>

      <section>
        <h2>10. Security practices (OWASP-aligned)</h2>
        <p className="mt-3">We design the Service to reduce common web risks, including:</p>
        <ul className="mt-3">
          <li>Password hashing (no plaintext passwords)</li>
          <li>Server-side authorization for admin and wallet actions</li>
          <li>Parameterized database access (no string-concatenated SQL)</li>
          <li>Secrets kept out of the client and out of routine logs</li>
          <li>Generic client error messages (no stack traces or secret leakage)</li>
          <li>Payment card data handled by Stripe, not stored in our database</li>
        </ul>
        <p className="mt-3">
          No method of transmission or storage is perfectly secure. If you discover a vulnerability,
          please report it privately to the contact email above.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p className="mt-3">
          The Service is not directed at children under 16. We do not knowingly collect personal data
          from children. If you believe a child has registered, contact us to remove the account.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p className="mt-3">
          We may update this policy when the Service or legal requirements change. The “Last updated”
          date at the top will change accordingly. Continued use after a material update constitutes
          acceptance of the revised notice where permitted by law.
        </p>
      </section>

      <section>
        <h2>13. Related</h2>
        <p className="mt-3">
          Provider identification (Impressum): <a href="/impressum">/impressum</a>
        </p>
      </section>
    </LegalShell>
  );
}
