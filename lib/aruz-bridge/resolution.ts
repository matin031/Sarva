/** Reduce fill-rate cost only after a sustained slow window, never on one bad frame. */
export function nextBridgeDpr(current: number, meanFrameMs: number): number {
  if (!Number.isFinite(meanFrameMs) || meanFrameMs <= 25 || current <= 1) return current;
  return Math.max(1, Math.round((current - .25) * 100) / 100);
}
