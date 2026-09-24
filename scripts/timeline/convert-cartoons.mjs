// Converts the poet illustrations in public/poempic (PNG wrapped in SVG) into
// small transparent WebP files that the timeline serves. Run from the repo root:
//   node scripts/timeline/convert-cartoons.mjs [sourceDir]
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const FILES = {
  rodaki: "person-2", ferdosi: "person-3", naser: "person-9", sanaee: "person-17", khaghani: "person-19",
  nezami: "person-20", molana: "person-23", saadi: "person-29", hafez: "person-37", jami: "person-41",
  babafaqani: "person-49", vahshi: "person-50", mohtasham: "person-51", kalim: "person-52", saeb: "person-53",
  bidel: "person-54", hatef: "person-69", qaani: "person-71", neshat: "person-73", taghibahar: "person-76",
  iraj: "person-79", dehkhoda: "person-89", ushij: "person-102", etesami: "person-103", sales: "person-105",
  daneshvar: "person-128", aminpoor: "person-138", garmaroodi: "person-139", harati: "person-143",
};

const from = process.argv[2] ?? "public/poempic";
const to = "public/literary-timeline/cartoons";
mkdirSync(to, { recursive: true });
let total = 0;
for (const file of readdirSync(from).filter(f => f.endsWith(".svg"))) {
  const id = FILES[file.replace(/\.svg$/, "")];
  if (!id) { console.warn(`skipped ${file}: no person id`); continue; }
  const b64 = readFileSync(join(from, file), "utf8").match(/<image[^>]*href="data:image\/png;base64,([^"]+)"/)?.[1];
  if (!b64) throw new Error(`${file}: no embedded PNG`);
  const out = join(to, `${id}.webp`);
  await sharp(Buffer.from(b64, "base64")).resize(560, 840, { fit: "inside" }).webp({ quality: 78, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(out);
  total += statSync(out).size;
  console.log(`${file} -> ${out} ${(statSync(out).size / 1024).toFixed(0)}KB`);
}
console.log(`total ${(total / 1024).toFixed(0)}KB`);
