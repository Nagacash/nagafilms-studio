import Link from 'next/link';

/**
 * Shared Naga Films brand lockup — matches landing page logo + wordmark.
 * `surface="film"` uses gold accent; `surface="footer"` can omit link wrapper.
 */
export default function BrandMark({ href = '/film', className = '', asLink = true }) {
  const content = (
    <>
      <img
        src="/assets/NAGA_round.png"
        alt=""
        width={36}
        height={36}
        className="nf-brand-logo"
        aria-hidden="true"
      />
      <span className="nf-brand-text">
        <span className="nf-brand-name">NAGA FILMS</span>
        <span className="nf-brand-surface">Film</span>
      </span>
    </>
  );

  if (!asLink) {
    return <div className={`nf-brand ${className}`}>{content}</div>;
  }

  return (
    <Link href={href} className={`nf-brand ${className}`} aria-label="Naga Film home">
      {content}
    </Link>
  );
}
