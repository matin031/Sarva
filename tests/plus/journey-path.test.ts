import test from "node:test";
import assert from "node:assert/strict";
import { buildJourneyPoints, journeyViewportY } from "@/components/UI/plus/scroll/journey-path";

const surfaces = [
  { left: 587, right: 1177, top: 1900, bottom: 2240 },
  { left: 247, right: 837, top: 2496, bottom: 2836 },
  { left: 587, right: 1177, top: 3092, bottom: 3432 },
];

test("staggered cards do not produce the old 10x sideways bursts", () => {
  const points = buildJourneyPoints({ from: { x: 712, y: 730 }, to: { x: 712, y: 3690 }, surfaces, width: 1425, compact: false });
  const peakSlope = Math.max(...points.slice(1).map((point, i) => Math.PI / 2 * Math.abs(point.x - points[i].x) / (point.y - points[i].y)));
  assert(peakSlope < 3, `Peak lateral speed per scroll pixel: ${peakSlope}`);
  for (const surface of surfaces) {
    const alongside = points.filter((point) => point.y >= surface.top - 24 && point.y <= surface.bottom + 24);
    assert(alongside.length >= 3);
    assert(alongside.every((point) => point.x <= surface.left - 24 || point.x >= surface.right + 24));
  }
});

test("mobile route stays in the reserved outside gutter", () => {
  for (const width of [320, 360, 390]) {
    const points = buildJourneyPoints({ from: { x: width / 2, y: 550 }, to: { x: width / 2, y: 2600 }, surfaces: [{ left: 22, right: width - 34, top: 1200, bottom: 1900 }], width, compact: true });
    assert(points.every((point) => point.x >= 14 && point.x <= width - 14));
    assert(points.filter((point) => point.y >= 1176 && point.y <= 1924).every((point) => point.x > width - 34));
  }
});

test("wrapped or overlapping sections never create backwards legs or lose the dock", () => {
  const to = { x: 180, y: 1700 };
  const points = buildJourneyPoints({ from: { x: 180, y: 600 }, to, surfaces: [
    { left: 22, right: 326, top: 590, bottom: 1050 },
    { left: 22, right: 326, top: 1040, bottom: 1690 },
  ], width: 360, compact: true });
  assert(points.slice(1).every((point, i) => point.y > points[i].y));
  assert.deepEqual(points.at(-1), to);
});

const viewport = { start: 100, end: 4000, fromY: 800, toY: 4480 };
test("a native wheel step does not jolt the star before scrub catches up", () => {
  const before = journeyViewportY({ ...viewport, progress: .4, scroll: 1660 });
  const after = journeyViewportY({ ...viewport, progress: .4, scroll: 1900 });
  assert.equal(after, before);
});

test("star follows the real document anchors before departure and after landing", () => {
  assert.equal(journeyViewportY({ ...viewport, progress: 0, scroll: 0 }), 800);
  assert.equal(journeyViewportY({ ...viewport, progress: 1, scroll: 4200 }), 280);
  assert.equal(journeyViewportY({ ...viewport, progress: 0, scroll: 100 }), 700);
  assert.equal(journeyViewportY({ ...viewport, progress: 1, scroll: 4000 }), 480);
});
