/**
 * قفسهٔ شاعران — بیرون‌کشیدنِ هندسهٔ کتاب از FBX به JSON.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * چرا نه «همان FBX را در مرورگر بارگذاری کنیم»
 * ──────────────────────────────────────────────────────────────────────────
 * `OldBook001.fbx` خودش فقط ۱۹ کیلوبایت است، ولی خواندنش یعنی فرستادنِ
 * `FBXLoader` به مرورگر — چهل‌وچند کیلوبایتِ فشرده کد، برای مدلی که در کل
 * **۵۲ مثلث** دارد. کلِ هندسه به‌صورتِ عدد، از خودِ بارکننده کوچک‌تر است.
 *
 * پس یک بار اینجا خوانده می‌شود و سه آرایهٔ ساده بیرون می‌آید. بازی
 * `BufferGeometry` را مستقیم از همان‌ها می‌سازد و هیچ بارکننده‌ای لازم ندارد.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * اصلاحِ مبدأ
 * ──────────────────────────────────────────────────────────────────────────
 * مبدأِ مدلِ خام روی «کفِ عقبِ چپ» است (x از ‎−۷٫۱۳‎ تا ‎۶٫۸۷‎، y از ۰ تا ۲۱،
 * z از ۰ تا ۳٫۵). برای چیدن روی طاقچه و برای چرخشِ «کج‌شدن»، مبدأ باید روی
 * **مرکزِ کف** باشد — یعنی x و z وسط، و y روی صفر.
 *
 * این جابه‌جایی همین‌جا در مختصات پخته می‌شود و نه با یک `position` در صحنه:
 * آن‌طور هر کال‌سایت باید همان عددِ جادویی را تکرار می‌کرد.
 *
 * ⚠️ فایلِ FBX دست نمی‌خورد.
 *
 *     npm run build:poets-shelf-book
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* شبیه‌سازِ حداقلیِ DOM — `FBXLoader` برای بافت‌ها به آن دست می‌زند. ما فقط
   هندسه می‌خواهیم، ولی مسیرِ کد بی‌قیدوشرط از آن رد می‌شود. */
class StubElement {
  constructor() {
    this.style = {};
    this.width = 1;
    this.height = 1;
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  getContext() {
    return { fillRect() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) };
  }
}
globalThis.document = { createElement: () => new StubElement(), createElementNS: () => new StubElement() };
globalThis.window = { URL: globalThis.URL };
globalThis.self = globalThis.window;
globalThis.URL.createObjectURL = () => "blob:stub";
globalThis.URL.revokeObjectURL = () => {};

const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const DIR = path.join(ROOT, "public", "games", "game-assets", "book");
const SRC = path.join(DIR, "OldBook001.fbx");
const OUT = path.join(DIR, "book-geometry.json");

const buf = fs.readFileSync(SRC);
const group = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");

let mesh = null;
group.traverse((o) => {
  if (o.isMesh && !mesh) mesh = o;
});
if (!mesh) throw new Error("در OldBook001.fbx هیچ مشی پیدا نشد.");

const geo = mesh.geometry;
geo.computeBoundingBox();
const box = geo.boundingBox;
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());

console.log(`مش: «${mesh.name}»، ${geo.attributes.position.count} رأس، ${geo.attributes.position.count / 3} مثلث`);
console.log(`ابعادِ خام: ${size.toArray().map((v) => v.toFixed(2)).join(" × ")}`);
console.log(`مبدأِ خام روی: ${box.min.toArray().map((v) => v.toFixed(2)).join(", ")}`);

/* جابه‌جایی به مرکزِ کف. y فقط به کف می‌آید (نه وسط) تا «روی طاقچه بایستد»
   یعنی position.y = ارتفاعِ طاقچه، بدونِ هیچ نصفه‌ای در محلِ فراخوانی. */
geo.translate(-center.x, -box.min.y, -center.z);
geo.computeBoundingBox();

const attr = (name) => {
  const a = geo.attributes[name];
  if (!a) throw new Error(`صفتِ «${name}» در هندسه نیست.`);
  // چهار رقم اعشار: زیرِ یک‌دهمِ میلی‌متر در مقیاسِ این مدل.
  return Array.from(a.array, (v) => Math.round(v * 1e4) / 1e4);
};

const payload = {
  generatedBy: "scripts/poets-shelf/build-book-geometry.mjs",
  source: "OldBook001.fbx",
  /* ابعاد به واحدِ خامِ مدل. `layout.ts` از همین‌ها مقیاسِ صحنه را حساب
     می‌کند، پس اگر روزی مدلِ دیگری جایش را گرفت، هیچ عددی در بازی دستی
     عوض نمی‌شود. */
  size: { x: size.x, y: size.y, z: size.z },
  position: attr("position"),
  normal: attr("normal"),
  uv: attr("uv"),
};

fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(`\nنوشته شد: ${path.relative(ROOT, OUT)}  (${(fs.statSync(OUT).size / 1024).toFixed(1)} کیلوبایت)`);
console.log(`مبدأِ تازه: مرکزِ کف — x و z وسط، y روی صفر.`);
