import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   بستهٔ کلیپ‌ها واقعاً به اسکلتِ واقعی می‌چسبد؟
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا این آزمون مهم‌ترین آزمونِ این بازی است.

   انیمیشن در three بی‌صدا شکست می‌خورد. اگر نامِ یک مسیر با هیچ گرهی
   نخواند، `PropertyBinding` فقط یک هشدار در کنسول می‌نویسد (یا هیچ) و آن
   استخوان ساکن می‌ماند. شخصیتی که نیم‌بند تکان بخورد، خیلی راحت به چشم
   نمی‌آید تا وقتی کسی دقیق نگاه کند.

   و اینجا دقیقاً همان‌جایی است که این پروژه می‌توانست بلغزد: استخوان‌ها در
   FBX و در GLB هر دو `mixamorig:Hips` نام دارند، ولی هر دو بارکننده نام‌ها
   را از `PropertyBinding.sanitizeNodeName` رد می‌کنند که `:` را حذف
   می‌کند. این آزمون آن فرض را *اثبات* می‌کند، به‌جای آنکه به آن تکیه کند.

   اسکلتِ مقصد از خودِ `glb.glb` ساخته می‌شود — نه یک فهرستِ دستی — پس اگر
   روزی مدل عوض شود، این آزمون همان چیزی را می‌سنجد که واقعاً بارگذاری
   می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CHAR_DIR = path.join(ROOT, "public", "games", "game-assets", "character");

/** شکلِ کمینه‌ای از glTF که این آزمون واقعاً می‌خواند. */
interface GlbNode {
  name?: string;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface GlbJson {
  nodes: GlbNode[];
  scenes: { nodes: number[] }[];
}

/** درختِ گره‌های GLB را می‌سازد، با همان نام‌هایی که `GLTFLoader` می‌گذارد. */
function buildSkeletonFromGlb(): THREE.Object3D {
  const buf = fs.readFileSync(path.join(CHAR_DIR, "glb.glb"));
  const total = buf.readUInt32LE(8);
  let off = 12;
  let json: GlbJson | null = null;
  while (off < total) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString("utf8"));
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  assert.ok(json, "چانکِ JSON در glb.glb پیدا نشد");

  const nodes = json.nodes;
  const objects: THREE.Object3D[] = nodes.map((node) => {
    const object = new THREE.Object3D();
    // ⚠️ دقیقاً همان کاری که GLTFLoader می‌کند.
    object.name = THREE.PropertyBinding.sanitizeNodeName(node.name ?? "");
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    return object;
  });
  nodes.forEach((node, i) => {
    for (const child of node.children ?? []) objects[i].add(objects[child]);
  });

  const scene = new THREE.Object3D();
  for (const index of json.scenes[0].nodes) scene.add(objects[index]);
  return scene;
}

interface Bundle {
  clips: Record<string, { clip: THREE.AnimationClipJSON; loop: boolean; note?: string }>;
}

const bundle: Bundle = JSON.parse(fs.readFileSync(path.join(CHAR_DIR, "clips.json"), "utf8"));
const skeleton = buildSkeletonFromGlb();

test("بسته هر چهار حرکتِ لازم را دارد", () => {
  for (const name of ["idle", "run", "victory", "hit"]) {
    assert.ok(bundle.clips[name], `کلیپِ «${name}» در بسته نیست`);
  }
});

test("هر کلیپ به یک AnimationClip معتبر تبدیل می‌شود", () => {
  for (const [name, entry] of Object.entries(bundle.clips)) {
    const clip = THREE.AnimationClip.parse(entry.clip);
    assert.ok(clip.duration > 0.5, `«${name}» طولِ معناداری ندارد (${clip.duration})`);
    assert.ok(clip.tracks.length > 50, `«${name}» فقط ${clip.tracks.length} مسیر دارد`);
    for (const track of clip.tracks) {
      assert.ok(track.times.length > 0, `«${name}»: مسیرِ ${track.name} کلیدفریم ندارد`);
      assert.ok(
        Number.isFinite(track.values[0]),
        `«${name}»: مسیرِ ${track.name} مقدارِ نامعتبر دارد`,
      );
    }
  }
});

test("⚠️ هر مسیرِ هر کلیپ به یک استخوانِ واقعیِ مدل می‌چسبد", () => {
  for (const [name, entry] of Object.entries(bundle.clips)) {
    const clip = THREE.AnimationClip.parse(entry.clip);
    for (const track of clip.tracks) {
      const nodeName = track.name.split(".")[0];
      const found = THREE.PropertyBinding.findNode(skeleton, nodeName);
      assert.ok(found, `«${name}»: مسیرِ «${track.name}» به هیچ گرهی از مدل نمی‌چسبد`);
    }
  }
});

test("⚠️ میکسر واقعاً استخوان‌ها را تکان می‌دهد", () => {
  /* چسبیدنِ نام کافی نیست — باید ثابت شود که پخش، مقدارِ استخوان را هم
     عوض می‌کند. اگر مسیرها به شاخهٔ اشتباه بچسبند یا وزن صفر بماند،
     آزمونِ بالا پاس می‌شود ولی شخصیت بی‌حرکت می‌ماند. */
  for (const [name, entry] of Object.entries(bundle.clips)) {
    const root = buildSkeletonFromGlb();
    const mixer = new THREE.AnimationMixer(root);
    const clip = THREE.AnimationClip.parse(entry.clip);
    mixer.clipAction(clip).play();

    const arm = THREE.PropertyBinding.findNode(root, "mixamorigLeftArm") as THREE.Object3D;
    assert.ok(arm, "استخوانِ بازوی چپ پیدا نشد");
    const before = arm.quaternion.clone();

    mixer.update(0);
    mixer.update(clip.duration * 0.4);

    assert.ok(
      before.angleTo(arm.quaternion) > 0.01,
      `«${name}»: بازو پس از پخش تکان نخورد — مسیرها نچسبیده‌اند`,
    );
  }
});

test("⚠️ کلیپ‌های درجا واقعاً درجا هستند", () => {
  /* اگر روزی نسخهٔ With Motion جایگزین شود، شخصیت با هر دور از جایش
     می‌لغزد و مقصدها کم‌کم غلط می‌شوند. */
  for (const name of ["idle", "run", "victory"]) {
    const clip = THREE.AnimationClip.parse(bundle.clips[name].clip);
    const hips = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
    assert.ok(hips, `«${name}»: مسیرِ جابه‌جاییِ لگن ندارد`);
    const n = hips.values.length / 3;
    const dx = hips.values[(n - 1) * 3] - hips.values[0];
    const dz = hips.values[(n - 1) * 3 + 2] - hips.values[2];
    const drift = Math.hypot(dx, dz);
    assert.ok(drift < 2, `«${name}» درجا نیست: ${(drift / 100).toFixed(3)} واحد رانش دارد`);
  }
});

test("کلیپ‌های حلقه‌شونده درزِ تمیز دارند", () => {
  /* اگر فریمِ اول و آخر از هم دور باشند، حلقه هر بار یک پرشِ دیدنی دارد. */
  for (const name of ["idle", "run", "victory"]) {
    const clip = THREE.AnimationClip.parse(bundle.clips[name].clip);
    let total = 0;
    let count = 0;
    for (const track of clip.tracks) {
      if (!/quaternion$/.test(track.name)) continue;
      const v = track.values;
      const n = v.length / 4;
      if (n < 2) continue;
      const first = new THREE.Quaternion(v[0], v[1], v[2], v[3]);
      const last = new THREE.Quaternion(v[(n - 1) * 4], v[(n - 1) * 4 + 1], v[(n - 1) * 4 + 2], v[(n - 1) * 4 + 3]);
      total += first.angleTo(last);
      count++;
    }
    const avgDeg = ((total / count) * 180) / Math.PI;
    assert.ok(avgDeg < 5, `«${name}»: درزِ حلقه ${avgDeg.toFixed(1)} درجه است`);
  }
});

test("⚠️ کلیپِ زمین‌خوردن روی زمین تمام می‌شود و همان‌جا می‌ماند", () => {
  /* مکثِ کمدی روی *آخرین فریمِ* این کلیپ می‌گذرد (`clampWhenFinished`).
     اگر کلیپ ایستاده تمام شود، شخصیت وسطِ مکث سرِپا می‌ایستد. */
  const clip = THREE.AnimationClip.parse(bundle.clips.hit.clip);
  const hips = clip.tracks.find((t) => /Hips\.position$/.test(t.name))!;
  const n = hips.values.length / 3;
  const startY = hips.values[1];
  const endY = hips.values[(n - 1) * 3 + 1];

  assert.ok(endY < startY * 0.35, `لگن باید خیلی پایین بیاید: از ${startY.toFixed(0)} به ${endY.toFixed(0)}`);
  assert.ok(endY < 45, `لگن باید نزدیکِ زمین تمام شود، شد ${endY.toFixed(0)}`);
});

test("⚠️ حرکتِ ریشهٔ زمین‌خوردن به‌اندازه‌ای است که از قفسه رد نشود", () => {
  /* کلیپِ خام ۷٫۳ متر به جلو می‌رفت. اسکریپتِ ساخت آن را کوچک می‌کند؛
     این آزمون می‌گوید که واقعاً کوچک شده. */
  const clip = THREE.AnimationClip.parse(bundle.clips.hit.clip);
  const hips = clip.tracks.find((t) => /Hips\.position$/.test(t.name))!;
  const n = hips.values.length / 3;
  let maxTravel = 0;
  for (let i = 0; i < n; i++) {
    maxTravel = Math.max(
      maxTravel,
      Math.hypot(hips.values[i * 3] - hips.values[0], hips.values[i * 3 + 2] - hips.values[2]),
    );
  }
  /* واحدِ مدل: مقدارِ خام ÷ ۱۰۰. با مقیاسِ شخصیت (~۰٫۳۲) این حدودِ ۶۰ سانتِ
     صحنه می‌شود. */
  const units = maxTravel / 100;
  assert.ok(units > 0.5, `حرکت نباید حذف شده باشد (${units.toFixed(2)} واحد)`);
  assert.ok(units < 2.5, `حرکت هنوز خیلی زیاد است (${units.toFixed(2)} واحد)`);
});
