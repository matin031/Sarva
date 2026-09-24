// Draws each cartoon's rig over the image so the coordinates in
// lib/literary-timeline/cartoon-rig.ts can be checked by eye.
//   node --import tsx scripts/timeline/rig-preview.mjs out.png [person-2 ...]
//   node --import tsx scripts/timeline/rig-preview.mjs out.png --wave [person-2 ...]
// `--wave` renders the split layers (scripts/timeline/rig-cartoons.mjs) with the
// hand at both ends of its swing, which shows any seam at the wrist.
import sharp from "sharp";
import { RIGS } from "../../lib/literary-timeline/cartoon-rig.ts";
import PIVOTS from "../../lib/literary-timeline/cartoon-pivots.json" with { type: "json" };

const args = process.argv.slice(2);
const out = args.shift();
const wave = args[0] === "--wave" ? args.shift() : null;
const ids = args.length ? args : Object.keys(RIGS);
const W = 280, H = 420, SWING = 16;

/** Body layer with the hand layer rotated by `angle` around the wrist, as the page draws it. */
async function swung(id, angle) {
  const [pxp, pyp] = PIVOTS[id];
  const px = Math.round(pxp / 100 * W), py = Math.round(pyp / 100 * H);
  const layer = f => sharp(`public/literary-timeline/cartoons/rig/${id}-${f}.webp`).resize(W, H).png().toBuffer();
  // Rotate around the pivot: centre a square canvas on it, rotate, put it back.
  const r = Math.ceil(Math.hypot(W, H));
  const canvas = await sharp({ create: { width: 2 * r, height: 2 * r, channels: 4, background: "#0000" } })
    .composite([{ input: await layer("hand"), left: r - px, top: r - py }]).png().toBuffer();
  const rotated = await sharp(canvas).rotate(angle, { background: "#0000" }).toBuffer({ resolveWithObject: true });
  const cut = await sharp(rotated.data).extract({ left: Math.round(rotated.info.width / 2 - px), top: Math.round(rotated.info.height / 2 - py), width: W, height: H }).toBuffer();
  return sharp(await layer("body")).composite([{ input: cut }]).png().toBuffer();
}

const cells = [];
for (const id of ids) {
  const rig = RIGS[id], file = `public/literary-timeline/cartoons/${id}.webp`;
  if (wave) {
    if (!rig.hand) continue;
    for (const angle of [-SWING, SWING]) cells.push({ label: `${id} ${angle}°`, input: await swung(id, angle) });
    continue;
  }
  let svg = "";
  if (rig.hand) {
    const [x0, y0, x1, y1, px, py] = rig.hand.map((v, k) => v / 100 * (k % 2 ? H : W));
    svg += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="red" stroke-width="1.5"/><circle cx="${px}" cy="${py}" r="3.5" fill="blue"/>`;
  }
  if (rig.eyes) {
    const [cx, cy, span] = rig.eyes;
    const x = cx / 100 * W, y = cy / 100 * H, d = span / 200 * W;
    svg += `<circle cx="${x - d}" cy="${y}" r="3" fill="lime"/><circle cx="${x + d}" cy="${y}" r="3" fill="lime"/>`;
  }
  const picture = await sharp(file).resize(W, H).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${svg}</svg>`) }]).png().toBuffer();
  cells.push({ label: `${id} ${rig.moves.join("+")}`, input: picture });
}

const cols = Math.min(cells.length, 8), rows = Math.ceil(cells.length / cols);
const layers = cells.flatMap((cell, i) => {
  const left = (i % cols) * W, top = Math.floor(i / cols) * (H + 18);
  return [
    { input: cell.input, left, top: top + 18 },
    { input: Buffer.from(`<svg width="${W}" height="18"><text x="${W / 2}" y="13" font-size="13" text-anchor="middle">${cell.label}</text></svg>`), left, top },
  ];
});
await sharp({ create: { width: W * cols, height: rows * (H + 18), channels: 4, background: "#f4efe4" } }).composite(layers).png().toFile(out);
console.log(`wrote ${out}`);
