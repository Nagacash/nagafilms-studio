export default function ColorPalette({ colors = [] }) {
  if (!colors.length) return null;
  return (
    <div className="nf-palette" aria-label="Dominant color palette">
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
