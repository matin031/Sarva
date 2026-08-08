/** A شمسه — the sun rosette at the centre of an illuminated Persian page.
 *
 *  Drawn rather than shipped as an asset: it is a handful of paths, it scales
 *  to any size without a second file, and it takes its colour from the caller
 *  so each book can carry its own.
 *
 *  Built as two star polygons of the same order offset by half a point, plus
 *  concentric rings. Shallow points (the inner radius is close to the outer)
 *  are what makes it read as a rosette rather than a sunburst. */
export default function Shamseh({
  points = 20,
  className,
  style,
}: {
  points?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const star = (outer: number, inner: number, turn = 0) => {
    const n = points * 2;
    return Array.from({ length: n }, (_, i) => {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * 2 * (i + turn)) / n - Math.PI / 2;
      return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
  };

  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round">
        <polygon points={star(49, 41)} />
        <polygon points={star(49, 41, 1)} />
        <polygon points={star(34, 28)} opacity={0.8} />
        <circle cx="50" cy="50" r="23" />
        <circle cx="50" cy="50" r="10" />
      </g>
      <polygon points={star(49, 41)} fill="currentColor" opacity={0.13} />
      <circle cx="50" cy="50" r="10" fill="currentColor" opacity={0.35} />
    </svg>
  );
}
