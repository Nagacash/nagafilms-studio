export default function OriginBadge({ origin = 'ai', placement = 'overlay' }) {
  const label = origin === 'photo' ? 'Photograph' : 'AI-generated';
  const extra = origin === 'photo' ? ' nf-origin-photo' : '';
  const place = placement === 'inline' ? ' nf-origin-inline' : '';
  return <span className={`nf-origin-badge${extra}${place}`}>{label}</span>;
}
