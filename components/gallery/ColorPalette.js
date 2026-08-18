export default function ColorPalette({ colors = [], variant = 'default' }) {
  if (!colors.length) return null;
  return (
    <div className={`nf-palette${variant === 'scene' ? ' nf-palette-scene' : ''}`} aria-label="Dominant color palette">
      {colors.map((color) => (
        <span
          key={color}
          className="nf-palette-chip"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
