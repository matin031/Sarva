/**
 * قفسهٔ شاعران — بیرون‌کشیدنِ کلیپ‌های میکسامو از FBX به یک بستهٔ JSON.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * چرا این اسکریپت وجود دارد
 * ──────────────────────────────────────────────────────────────────────────
 * میکسامو هر انیمیشن را با یک نسخهٔ کاملِ *مدل* تحویل می‌دهد. چهار فایلِ
 * `Idle.fbx`، `Running.fbx`، `Hit To Head.fbx` و `Victory Idle.fbx` روی هم
 * حدودِ ۲۰ مگابایت‌اند، در حالی که تنها چیزی که بازی از آن‌ها می‌خواهد
 * *مسیرهای انیمیشن* است — مدل که همان `glb.glb` است و یک بار بارگذاری
 * می‌شود.
 *
 * فرستادنِ آن ۲۰ مگابایت به مرورگر یعنی چهار بار دانلود و پارس کردنِ یک
 * مشِ پوست‌دار که بلافاصله دور ریخته می‌شود. این اسکریپت همان کار را یک بار
 * و روی دیسک انجام می‌دهد و فقط مسیرها را بیرون می‌کشد.
 *
 * ⚠️ فایل‌های FBX دست نمی‌خورند. این اسکریپت فقط می‌خواند.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * اجرا
 * ──────────────────────────────────────────────────────────────────────────
 *     npm run build:poets-shelf-clips
 *
 * خروجی: ‎public/games/game-assets/character/clips.json‎
 *
 * ──────────────────────────────────────────────────────────────────────────
 * افزودنِ کلیپِ تازه
 * ──────────────────────────────────────────────────────────────────────────
 * فقط یک سطر به `SOURCES` اضافه کنید و دوباره اجرا کنید. هیچ کدِ بازی عوض
 * نمی‌شود؛ `lib/poets-shelf/clips.ts` نام‌های معنایی را از همین فایل
 * می‌خواند و اگر کلیپی نبود، با احترام کنار می‌گذارد.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ── شبیه‌سازِ حداقلیِ DOM ──────────────────────────────────────────────────
   `FBXLoader` برای بافت‌های جاسازی‌شده به `document` و `URL.createObjectURL`
   دست می‌زند. ما بافتی نمی‌خواهیم — فقط مسیرهای انیمیشن — ولی مسیرِ کد
   بی‌قید‌وشرط از آن‌ها رد می‌شود. این خرده‌شبیه‌ساز فقط می‌گذارد پارس تمام
   شود؛ هیچ تصویری واقعاً رمزگشایی نمی‌شود. */
class StubElement {
  constructor() {
    this.style = {};
    this.width = 1;
    this.height = 1;
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  appendChild() {}
  removeChild() {}
  getContext() {
    return {
      fillRect() {},
      drawImage() {},
      putImageData() {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    };
  }
}
globalThis.document = {
  createElement: () => new StubElement(),
  createElementNS: () => new StubElement(),
};
globalThis.window = { URL: globalThis.URL };
globalThis.self = globalThis.window;
globalThis.URL.createObjectURL = () => "blob:stub";
globalThis.URL.revokeObjectURL = () => {};

const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const CHAR_DIR = path.join(ROOT, "public", "games", "game-assets", "character");
const OUT = path.join(CHAR_DIR, "clips.json");

/* ── کاتالوگِ منبع ─────────────────────────────────────────────────────────

   `name` نامِ *معنایی* است — همان چیزی که بازی می‌شناسد. نامِ فایل هیچ‌جای
   دیگری ظاهر نمی‌شود، پس عوض‌کردنِ منبعِ یک حرکت فقط همین‌جاست.

   `trim`  بازهٔ ثانیه‌ای که نگه داشته می‌شود (‎[از، تا]‎). `null` یعنی همه.
   `rootMotion`
       "in-place" → ادعا می‌کند کلیپ درجاست و *بررسی* می‌کند؛ مقدارها دست
                    نمی‌خورند. اگر روزی کلیپی با حرکتِ ریشه جایش را گرفت،
                    اسکریپت می‌شکند به‌جای آنکه بازی کج شود.
       "keep"     → دست نخورده و بی‌بررسی.
       عدد        → ضریبِ کوچک‌کردنِ جابه‌جاییِ افقی. ارتفاع همیشه حفظ می‌شود.
   `loop`  فقط برای ثبت در خروجی؛ مصرف‌کننده‌اش لایهٔ React است. */
const SOURCES = [
  {
    name: "idle",
    file: "Idle.fbx",
    trim: null,
    rootMotion: "in-place",
    loop: true,
    note: "حالتِ پیش‌فرض. درجا، و درزِ حلقه‌اش صفر است.",
  },
  {
    name: "run",
    file: "Running.fbx",
    trim: null,
    rootMotion: "in-place",
    loop: true,
    note: "عمداً In Place صادر شده؛ جابه‌جاییِ جهانی کارِ MovementController است.",
  },
  {
    name: "victory",
    file: "Victory Idle.fbx",
    trim: null,
    rootMotion: "in-place",
    loop: true,
    note: "پاسخِ درست. حلقه‌شونده است ولی بازی یک‌بار پخشش می‌کند.",
  },
  {
    name: "hit",
    file: "Hit To Head.fbx",
    /* ⚠️ چرا از ۰٫۴۰ و نه از صفر.
       کلیپِ اصلی سه پرده دارد: «دویدن به جلو» (۰ تا ~۰٫۴)، «خوردنِ ضربه و
       معلق‌زدن» (~۰٫۴ تا ~۱٫۵) و «افتاده ماندن» (~۱٫۵ تا ۲٫۵۳).

       پردهٔ اول به درد ما نمی‌خورد: شخصیتِ ما همین حالا جلوی کتاب *ایستاده*
       است و دویدنش تمام شده. اگر از صفر پخش شود، بازیکن می‌بیند که او بی‌دلیل
       چند قدم به جلو می‌دود و بعد ضربه می‌خورد.

       در ۰٫۴۰ لگن ۳۰ درجه به جلو خم شده و هنوز در اوجِ حرکت است. محوشدنِ
       سریع از «ایستاده» به همین ژست، خودش *لحظهٔ ضربه* را می‌سازد — یعنی
       همان چیزی که می‌خواهیم، بدونِ آنکه چیزی جعل شده باشد. */
    trim: [0.4, 2.5333],
    /* ⚠️ چرا ۰٫۳۵ و نه «حذفِ کامل» و نه «دست‌نخورده».

       کلیپ در این بازه ۵٫۲۵ واحد به جلو می‌رود که با مقیاسِ شخصیت حدودِ
       ۱٫۷ متر می‌شود — یعنی از پای قفسه رد می‌شد و از کادر بیرون می‌زد.

       ولی صفرکردنش هم غلط است: در یک معلق‌زدنِ واقعی لگن نسبت به پاها جابه‌جا
       *می‌شود*، و بدونِ آن بدن دورِ یک نقطهٔ ثابت می‌چرخد و شبیهِ عروسکِ
       بندی می‌شود.

       ۰٫۳۵ یعنی حدودِ ۶۰ سانت — به‌اندازهٔ کافی که مکانیکِ بدن درست بخواند و
       به‌اندازهٔ کافی کم که دقیقاً پای همان قفسه بیفتد.

       جهتش هم درست است: کلیپ او را به *جلو* می‌برد، یعنی به سمتِ کتابی که
       رویش افتاده. کتاب از بالا روی سرش می‌آید، پس به جلو مچاله می‌شود. */
    rootMotion: 0.35,
    loop: false,
    note: "پاسخِ نادرست. پردهٔ دویدنِ ابتدایی بریده شده؛ از لحظهٔ ضربه شروع می‌شود.",
  },
];

/* ── نامِ استخوان‌های مقصد ─────────────────────────────────────────────────
   از خودِ `glb.glb` خوانده می‌شود تا این اسکریپت یک فهرستِ دستیِ دوم نداشته
   باشد که روزی از مدل عقب بیفتد.

   ⚠️ هر دو بارکننده نام‌ها را از `PropertyBinding.sanitizeNodeName` رد
   می‌کنند، که `:` را حذف می‌کند. پس `mixamorig:Hips` در هر دو طرف
   `mixamorigHips` می‌شود و مسیرها بدونِ هیچ نگاشتی می‌چسبند. این را
   اسکریپت پایین‌تر *بررسی* هم می‌کند و اگر روزی عوض شد، می‌شکند. */
function glbBoneNames() {
  const buf = fs.readFileSync(path.join(CHAR_DIR, "glb.glb"));
  const total = buf.readUInt32LE(8);
  let off = 12;
  let json = null;
  while (off < total) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString("utf8"));
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json) throw new Error("چانکِ JSON در glb.glb پیدا نشد.");
  const joints = json.skins?.[0]?.joints ?? [];
  return new Set(joints.map((j) => THREE.PropertyBinding.sanitizeNodeName(json.nodes[j].name ?? "")));
}

/** کلیپِ واقعی را از میانِ کلیپ‌های یک FBX جدا می‌کند.
 *
 *  ⚠️ هر چهار فایل *دو* کلیپ دارند: یکی به نامِ `mixamo.com` که حرکتِ واقعی
 *  است، و یکی به نامِ `Armature|Armature|mixamo.com|Layer0` با دو کلیدفریم و
 *  طولِ ۰٫۰۳ ثانیه که یک ژستِ ساکنِ بی‌مصرف است (همین زائده در خودِ glb.glb
 *  هم هست). انتخاب بر اساسِ *نام* شکننده بود، پس بر اساسِ طول است. */
function pickClip(animations, file) {
  const real = animations.filter((a) => a.duration > 0.5).sort((a, b) => b.tracks.length - a.tracks.length);
  if (!real.length) {
    throw new Error(`${file}: هیچ کلیپِ واقعی‌ای (طولِ بیش از ۰٫۵ ثانیه) ندارد.`);
  }
  return real[0];
}

const round = (v, p) => {
  const f = 10 ** p;
  return Math.round(v * f) / f;
};

/** بازهٔ ‎[from، to]‎ را می‌بُرد و زمان‌ها را به صفر می‌آورد.
 *
 *  کلیدهای دو سرِ بازه با درون‌یابیِ خودِ مسیر ساخته می‌شوند تا ژستِ شروع
 *  دقیقاً همان چیزی باشد که در آن لحظه دیده می‌شد، نه نزدیک‌ترین کلیدفریم. */
function trimTrack(track, from, to) {
  const stride = track.getValueSize();
  const times = [];
  const values = [];
  const interp = track.createInterpolant();

  const push = (t) => {
    const out = interp.evaluate(t);
    times.push(t - from);
    for (let i = 0; i < stride; i++) values.push(out[i]);
  };

  push(from);
  for (let i = 0; i < track.times.length; i++) {
    const t = track.times[i];
    if (t > from && t < to) {
      times.push(t - from);
      for (let k = 0; k < stride; k++) values.push(track.values[i * stride + k]);
    }
  }
  push(to);

  track.times = new Float32Array(times);
  track.values = new Float32Array(values);
  return track;
}

/**
 * چرخشِ کلِ کلیپ حولِ محورِ عمودی تا رو به جلو بایستد.
 *
 * ⚠️ چرا لازم است: کلیپِ `Idle` میکسامو بدن را ثابت ۴۳ درجه چرخیده نگه
 * می‌دارد (اندازه‌گیری شد: بازهٔ یاوِ لگن ‎−۴۳٫۲°‎ تا ‎−۴۲٫۹°‎)، در حالی که
 * `Running` تقریباً روی صفر است. بدونِ این اصلاح، هر گذارِ ایستاده↔دویدن یک
 * چرخشِ ۴۳ درجه‌ایِ ناگهانی داشت و «رو به کتاب ایستادن» هیچ‌وقت درست
 * نمی‌شد — چون خودِ حرکت، جهتِ گروه را نقض می‌کرد.
 *
 * مرجع، یاوِ *اولین فریم* است و نه میانگین: در `hit` شخصیت وسطِ معلق‌زدن
 * دورِ خودش می‌چرخد، پس میانگین بی‌معناست ولی فریمِ اول همان جهتی است که
 * ایستاده بوده.
 */
function normalizeYaw(clip) {
  const rot = clip.tracks.find((t) => /Hips\.quaternion$/.test(t.name));
  if (!rot) return 0;

  const q0 = new THREE.Quaternion(rot.values[0], rot.values[1], rot.values[2], rot.values[3]);
  const yaw = new THREE.Euler().setFromQuaternion(q0, "YXZ").y;
  if (Math.abs(yaw) < 1e-4) return 0;

  const fix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);

  // چرخش در فضای *والد* اعمال می‌شود، پس از چپ ضرب می‌شود.
  const q = new THREE.Quaternion();
  for (let i = 0; i < rot.values.length; i += 4) {
    q.set(rot.values[i], rot.values[i + 1], rot.values[i + 2], rot.values[i + 3]);
    q.premultiply(fix);
    rot.values[i] = q.x;
    rot.values[i + 1] = q.y;
    rot.values[i + 2] = q.z;
    rot.values[i + 3] = q.w;
  }

  // جابه‌جایی هم باید با همان زاویه بچرخد، وگرنه مسیرِ حرکت کج می‌ماند.
  const pos = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  if (pos) {
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.values.length; i += 3) {
      v.set(pos.values[i], pos.values[i + 1], pos.values[i + 2]).applyQuaternion(fix);
      pos.values[i] = v.x;
      pos.values[i + 1] = v.y;
      pos.values[i + 2] = v.z;
    }
  }
  return yaw;
}

/**
 * سیاستِ حرکتِ ریشه.
 *
 * ⚠️ ارتفاع (y) هرگز دست نمی‌خورد. در `hit` همان y است که سقوط را می‌سازد؛
 * صفرکردنش یعنی شخصیت ایستاده معلق بزند.
 *
 * فقط x و z نسبت به *فریمِ اول* مقیاس می‌خورند، پس ژستِ شروع سرِ جایش
 * می‌ماند و تنها دامنهٔ جابه‌جایی عوض می‌شود.
 */
function applyRootMotion(clip, policy, name) {
  const pos = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  if (!pos || policy === "keep") return null;

  const n = pos.values.length / 3;
  const x0 = pos.values[0];
  const z0 = pos.values[2];
  /* «رانش» فاصلهٔ *خالصِ* اول تا آخر است، نه بیشترین جابه‌جایی.
     تفاوتش مهم است: در یک چرخهٔ دویدنِ درجا لگن چند سانت به چپ و راست
     می‌رود (بیشترین جابه‌جایی بزرگ است) ولی سرِ حلقه به همان‌جا برمی‌گردد
     (رانش صفر است). آن تابِ پهلو‌به‌پهلو *بخشی از حرکت* است و نباید حذف شود. */
  const drift = Math.hypot(pos.values[(n - 1) * 3] - x0, pos.values[(n - 1) * 3 + 2] - z0);

  if (policy === "in-place") {
    /* گاردِ زمانِ ساخت. کلیپ‌های امروز رانشِ صفر دارند (In Place صادر شده‌اند)
       و مقدارهایشان *دست نمی‌خورد* تا تابِ طبیعیِ لگن حفظ شود. ولی اگر روزی
       کسی به‌جای Running نسخهٔ With Motion را بگذارد، شخصیت با هر دور از
       جایش می‌لغزید و کسی نمی‌فهمید چرا. اینجا به‌جایش می‌شکند. */
    if (drift > 2) {
      throw new Error(
        `کلیپِ «${name}» درجا نیست: ${(drift / 100).toFixed(2)} واحد رانشِ افقی دارد. ` +
          `نسخهٔ In Place را از میکسامو بگیرید، یا سیاستِ rootMotion را به یک ضریب عوض کنید.`,
      );
    }
    return { drift, kept: true };
  }

  let maxBefore = 0;
  for (let i = 0; i < pos.values.length; i += 3) {
    const dx = pos.values[i] - x0;
    const dz = pos.values[i + 2] - z0;
    maxBefore = Math.max(maxBefore, Math.hypot(dx, dz));
    pos.values[i] = x0 + dx * policy;
    pos.values[i + 2] = z0 + dz * policy;
  }
  return { maxBefore, maxAfter: maxBefore * policy };
}

/* ── اجرا ──────────────────────────────────────────────────────────────── */

const targetBones = glbBoneNames();
console.log(`اسکلتِ مقصد: ${targetBones.size} استخوان از glb.glb\n`);

const bundle = { generatedBy: "scripts/poets-shelf/build-clips.mjs", clips: {} };
let dropped = 0;

for (const src of SOURCES) {
  const file = path.join(CHAR_DIR, src.file);
  if (!fs.existsSync(file)) {
    console.warn(`  ✗ ${src.name.padEnd(8)} — «${src.file}» پیدا نشد، رد شد.`);
    continue;
  }

  const buf = fs.readFileSync(file);
  const group = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
  const clip = pickClip(group.animations, src.file);
  const rawDuration = clip.duration;

  /* مسیرهایی که استخوانِ مقصدشان در مدل نیست کنار گذاشته می‌شوند.
     امروز هیچ‌کدام حذف نمی‌شوند، ولی `FBXLoader` برای هر برگِ اسکلت یک
     استخوانِ `_end` اضافه می‌سازد؛ اگر روزی کلیپی برای آن‌ها مسیر داشت،
     three در زمانِ اجرا برای هرکدام یک هشدار در کنسول می‌نوشت. */
  const before = clip.tracks.length;
  clip.tracks = clip.tracks.filter((t) => targetBones.has(t.name.split(".")[0]));
  dropped += before - clip.tracks.length;

  if (src.trim) {
    const [from, to] = src.trim;
    for (const t of clip.tracks) trimTrack(t, from, to);
    clip.duration = to - from;
    clip.resetDuration();
  }

  const yaw = normalizeYaw(clip);
  const motion = applyRootMotion(clip, src.rootMotion, src.name);

  // کلیپ همیشه نامِ *معنایی* را می‌گیرد، نه «mixamo.com» را.
  clip.name = src.name;

  const json = THREE.AnimationClip.toJSON(clip);
  /* گِردکردن حجمِ متن را تقریباً نصف می‌کند و در عمل دیده نمی‌شود:
     پنج رقمِ اعشار روی چهارگانه یعنی خطای زاویه‌ای زیرِ ۰٫۰۰۱ درجه. */
  for (const t of json.tracks) {
    const p = t.type === "vector" ? 3 : 5;
    t.times = Array.from(t.times, (v) => round(v, 4));
    t.values = Array.from(t.values, (v) => round(v, p));
  }

  bundle.clips[src.name] = { clip: json, loop: src.loop, note: src.note };

  const parts = [
    `طول ${clip.duration.toFixed(3)}s`,
    src.trim ? `(از ${rawDuration.toFixed(2)}s بریده شد)` : "",
    `${clip.tracks.length} مسیر`,
    Math.abs(yaw) > 1e-4 ? `یاو ${((-yaw * 180) / Math.PI).toFixed(1)}° اصلاح شد` : "",
    /* ⚠️ واحد اینجا «واحدِ مدل» است و نه متر: مقدارهای خامِ کلیپ سانتی‌متری‌اند
       و مقیاسِ ۰٫۰۱ آرمیچر آن‌ها را به واحدِ مدل می‌آورد. تبدیل به مترِ صحنه
       یک ضربِ دیگر لازم دارد (`CHARACTER_SCALE` در lib/poets-shelf/layout.ts). */
    motion?.kept ? `درجا ✓ (رانش ${(motion.drift / 100).toFixed(3)} واحد)` : "",
    motion && !motion.kept && motion.maxBefore > 1
      ? `حرکتِ ریشه ${(motion.maxBefore / 100).toFixed(2)} → ${(motion.maxAfter / 100).toFixed(2)} واحدِ مدل`
      : "",
  ].filter(Boolean);
  console.log(`  ✓ ${src.name.padEnd(8)} ${parts.join("  ·  ")}`);
}

if (dropped) console.log(`\n  ${dropped} مسیر بدونِ استخوانِ متناظر کنار گذاشته شد.`);

fs.writeFileSync(OUT, JSON.stringify(bundle));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`\nنوشته شد: ${path.relative(ROOT, OUT)}  (${kb} کیلوبایت)`);
console.log(`کلیپ‌ها: ${Object.keys(bundle.clips).join("، ")}`);
