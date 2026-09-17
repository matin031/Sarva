export type JourneyPoint = { x: number; y: number };
export type JourneySurface = { left: number; right: number; top: number; bottom: number };

/** Follow the nearest outside edge, without darting back to every card's centre. */
export function buildJourneyPoints({ from, to, surfaces, width, compact }: {
  from: JourneyPoint;
  to: JourneyPoint;
  surfaces: JourneySurface[];
  width: number;
  compact: boolean;
}): JourneyPoint[] {
  const points = [from];
  const margin = compact ? 14 : 24;
  const pad = compact ? 16 : 30;
  const clampX = (x: number) => Math.max(margin, Math.min(width - margin, x));
  const append = (point: JourneyPoint) => {
    // Narrow windows and wrapped copy can leave a short gap. Never create a
    // negative-duration leg or silently discard the actual landing point.
    if (point.y > points[points.length - 1].y && point.y < to.y) points.push(point);
  };
  for (const surface of surfaces) {
    const left = clampX(surface.left - pad);
    const right = clampX(surface.right + pad);
    const goRight = compact || Math.abs(right - width / 2) < Math.abs(left - width / 2);
    const edge = goRight ? right : left;
    const bow = compact ? 3 : 16;
    append({ x: edge, y: surface.top - 24 });
    append({ x: clampX(edge + (goRight ? bow : -bow)), y: (surface.top + surface.bottom) / 2 });
    append({ x: edge, y: surface.bottom + 24 });
  }
  append({ x: to.x, y: to.y - 60 });
  points.push(to);
  return points;
}

/** During the journey the star floats in viewport space. Native wheel steps
 * must not shove it upwards before the scrubbed animation has caught up.
 * Before departure and after landing it tracks its actual document anchor. */
export function journeyViewportY({ progress, scroll, start, end, fromY, toY }: {
  progress: number; scroll: number; start: number; end: number; fromY: number; toY: number;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const outside = scroll < start ? scroll - start : scroll > end ? scroll - end : 0;
  return (fromY - start) * (1 - p) + (toY - end) * p - outside;
}
