import LegalShell from '@/components/LegalShell';

export const metadata = {
  title: 'Impressum — Naga Films Studio',
  description: 'Impressum und Anbieterkennzeichnung gemäß § 5 TMG.',
};

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p className="mt-3">
          <strong>Verantwortlich für den Inhalt</strong>
          <br />
          Maurice Holda
          <br />
          Bei Schuldts Stift 2
          <br />
          20355 Hamburg
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p className="mt-3">
          E-Mail:{' '}
          <a href="mailto:chosenfewrecords@hotmail.de">chosenfewrecords@hotmail.de</a>
        </p>
      </section>

      <section>
        <h2>Hinweis: Kleinstunternehmer</h2>
        <p className="mt-3">
          Dies ist kein gewerblich eingetragenes Unternehmen (keine GmbH/UG). Verantwortliche Person im
          Sinne des § 55 Abs. 2 RStV: Maurice Holda (Adresse wie oben).
        </p>
      </section>
    </LegalShell>
  );
}
