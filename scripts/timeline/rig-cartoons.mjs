// Splits each rigged cartoon into a body layer (hand removed) and a hand layer,
// so the hand can wave without dragging bits of beard or sleeve along.
//   node --import tsx scripts/timeline/rig-cartoons.mjs
//
// Within the rig's hand box, the hand is the largest connected patch of opaque
// pixels; anything else in the box (beard, turban cloth) stays on the body.
// The wrist pivot is the middle of where the hand patch meets the box's
// bottom edge. Output: public/literary-timeline/cartoons/rig/<id>-{body,hand}.webp
// and lib/literary-timeline/cartoon-pivots.json.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { RIGS } from "../../lib/literary-timeline/cartoon-rig.ts";

const DIR = "public/literary-timeline/cartoons";
mkdirSync(`${DIR}/rig`, { recursive: true });
const pivots = {};
for (const [id, rig] of Object.entries(RIGS)) {
  if (!rig.hand) continue;
  const { data, info } = await sharp(`${DIR}/${id}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  // Reach a little past the box top and sides: fingertips often poke out, and the
  // component search below keeps anything that is not hand out anyway.
  const [x0, y0, x1, y1] = rig.hand.slice(0, 4).map((v, k) => Math.round((k === 1 ? Math.max(0, v - 3) : rig.tight ? v : k === 0 ? Math.max(0, v - 2) : k === 2 ? Math.min(100, v + 2) : v) / 100 * (k % 2 ? H : W)));
  const inBox = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const opaque = i => data[i * 4 + 3] > 24;
  // Label connected components (4-neighbour) inside the box.
  const label = new Int32Array(W * H);
  let best = { id: 0, size: 0 }, next = 1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const start = y * W + x;
    if (label[start] || !opaque(start)) continue;
    const stack = [start];
    label[start] = next;
    let size = 0;
    while (stack.length) {
      const p = stack.pop(); size++;
      const px = p % W, py = (p - px) / W;
      for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
        const q = ny * W + nx;
        if (inBox(nx, ny) && !label[q] && opaque(q)) { label[q] = next; stack.push(q); }
      }
    }
    if (size > best.size) best = { id: next, size };
    next++;
  }
  // Opening: erode, keep the biggest piece, grow back. This cuts hair or beard
  // joined to the hand by a thin bridge. Then grow a few px more into the soft
  // edge so no fringe of the hand stays behind on the body.
  const step = (mask, keep) => {
    const out = new Uint8Array(W * H);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const p = y * W + x, n = [p + 1, p - 1, p + W, p - W];
      out[p] = keep === "erode" ? +(mask[p] && n.every(q => mask[q])) : +(mask[p] || (n.some(q => mask[q]) && data[p * 4 + 3] > (keep === "soft" ? 0 : 24)));
    }
    return out;
  };
  let hand = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (label[p] === best.id) hand[p] = 1;
  for (let k = 0; k < 3; k++) hand = step(hand, "erode");
  const core = new Uint8Array(W * H), seen = new Uint8Array(W * H);
  let biggest = [];
  for (let p = 0; p < W * H; p++) {
    if (!hand[p] || seen[p]) continue;
    const piece = [], stack = [p]; seen[p] = 1;
    while (stack.length) { const q = stack.pop(); piece.push(q); for (const r of [q + 1, q - 1, q + W, q - W]) if (hand[r] && !seen[r]) { seen[r] = 1; stack.push(r); } }
    if (piece.length > biggest.length) biggest = piece;
  }
  for (const p of biggest) core[p] = 1;
  hand = core;
  for (let k = 0; k < 3; k++) hand = step(hand, "grow");
  // Give back small pieces the erosion shaved off (thin fingertips) while big
  // ones (a slab of beard) stay on the body.
  const done = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (label[p] !== best.id || hand[p] || done[p]) continue;
    const piece = [], stack = [p]; done[p] = 1;
    while (stack.length) { const q = stack.pop(); piece.push(q); for (const r of [q + 1, q - 1, q + W, q - W]) if (label[r] === best.id && !hand[r] && !done[r]) { done[r] = 1; stack.push(r); } }
    if (piece.length < 260) for (const q of piece) hand[q] = 1;
  }
  for (let k = 0; k < 3; k++) hand = step(hand, "soft");
  // The wrist strip stays on the body as well, so the swing never opens a gap there.
  const strip = y1 - Math.round(H * .035);
  const body = Buffer.from(data), only = Buffer.alloc(data.length);
  let sum = 0, count = 0;
  for (let p = 0; p < W * H; p++) {
    if (!hand[p]) continue;
    data.copy(only, p * 4, p * 4, p * 4 + 4);
    if (p < strip * W) body[p * 4 + 3] = 0;
    if (Math.floor(p / W) === y1 - 1) { sum += p % W; count++; }
  }
  const raw = { raw: { width: W, height: H, channels: 4 } };
  await sharp(body, raw).webp({ quality: 78, alphaQuality: 90, effort: 6 }).toFile(`${DIR}/rig/${id}-body.webp`);
  await sharp(only, raw).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(`${DIR}/rig/${id}-hand.webp`);
  const px = count ? sum / count : (x0 + x1) / 2;
  pivots[id] = [+(px / W * 100).toFixed(1), +(y1 / H * 100).toFixed(1)];
  console.log(id, "hand px", best.size, "pivot", pivots[id]);
}
writeFileSync("lib/literary-timeline/cartoon-pivots.json", JSON.stringify(pivots, null, 2) + "\n");
