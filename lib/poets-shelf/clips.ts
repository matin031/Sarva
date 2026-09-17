"use client";

import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   کاتالوگِ حرکت‌های شخصیت.
   ═══════════════════════════════════════════════════════════════════════════

   ── چه چیزی از کجا می‌آید ─────────────────────────────────────────────────

   مدل (`glb.glb`) اسکلت و پوست را می‌آورد ولی *هیچ حرکتِ قابلِ استفاده‌ای*
   ندارد: تنها کلیپِ درونش دو کلیدفریم در ۰٫۰۶۷ ثانیه دارد، یعنی یک ژستِ
   ساکن. حرکت‌های واقعی چهار فایلِ FBX جداگانه از میکسامو هستند.

   آن چهار فایل روی هم ۲۰ مگابایت‌اند چون هرکدام یک نسخهٔ کاملِ مدل را هم
   حمل می‌کنند. `scripts/poets-shelf/build-clips.mjs` یک بار آن‌ها را
   می‌خواند، فقط مسیرهای انیمیشن را بیرون می‌کشد و در `clips.json` می‌ریزد —
   ۳۷۲ کیلوبایت به‌جای ۲۰ مگابایت، و بدونِ نیاز به `FBXLoader` در مرورگر.

   ── چرا نام‌ها می‌چسبند ────────────────────────────────────────────────────

   استخوان‌های میکسامو در FBX و در GLB هر دو `mixamorig:Hips` نام دارند، و
   هر دو بارکنندهٔ three نام‌ها را از `PropertyBinding.sanitizeNodeName` رد
   می‌کنند که `:` را حذف می‌کند. پس هر دو طرف به `mixamorigHips` می‌رسند و
   هیچ نگاشتی لازم نیست. (اندازه‌گیری شد: هر ۶۶ مسیرِ هر چهار کلیپ بدونِ
   استثنا می‌چسبند.)

   ── جایگزین‌پذیری ─────────────────────────────────────────────────────────

   `resolveClips` اول داخلِ *خودِ مدل* دنبالِ کلیپ با نامِ معنایی می‌گردد و
   تنها اگر پیدا نکرد سراغِ بسته می‌رود. یعنی اگر روزی یک GLB با انیمیشن‌های
   جاسازی‌شده جای این مدل را بگیرد، خودبه‌خود ترجیح داده می‌شود و هیچ کدی
   عوض نمی‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

/** نامِ *معنایی* حرکت‌ها. بازی فقط این‌ها را می‌شناسد، نه نامِ فایل‌ها. */
export type ClipName = "idle" | "run" | "victory" | "hit";

export const CLIPS_URL = "/games/game-assets/character/clips.json";
export const CHARACTER_URL = "/games/game-assets/character/glb.glb";

interface BundleEntry {
  /* ⚠️ `AnimationClipJSON` و نه `unknown`: این دقیقاً همان شکلی است که
     `AnimationClip.toJSON` در اسکریپتِ ساخت تولید می‌کند، پس نوعِ دو سرِ
     خط یکی است و اگر روزی قالبِ بسته عوض شد، کامپایلر می‌گوید. */
  clip: THREE.AnimationClipJSON;
  loop: boolean;
  note?: string;
}
interface ClipBundle {
  clips: Partial<Record<ClipName, BundleEntry>>;
}

export interface ResolvedClip {
  clip: THREE.AnimationClip;
  loop: boolean;
  /** از کجا آمد — فقط برای اشکال‌زدایی و گزارش. */
  origin: "model" | "bundle";
}

export type ClipSet = Partial<Record<ClipName, ResolvedClip>>;

/* ── بارگذاری با Suspense ──────────────────────────────────────────────────

   ⚠️ وعده در سطحِ ماژول ذخیره می‌شود و نه در رندر. `use()` هر بار همان شیءِ
   وعده را لازم دارد؛ ساختنِ وعدهٔ تازه در هر رندر یعنی Suspense هیچ‌وقت حل
   نمی‌شود. همین حافظه باعث می‌شود سوارشدنِ دوبارهٔ بازی (تغییرِ مسیر، hot
   reload) دوباره دانلود نکند. */
const bundleCache = new Map<string, Promise<ClipBundle>>();

export function loadClipBundle(url: string = CLIPS_URL): Promise<ClipBundle> {
  let pending = bundleCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`بارگذاریِ کلیپ‌ها شکست خورد (${res.status})`);
        return res.json() as Promise<ClipBundle>;
      })
      .catch((error) => {
        /* ⚠️ حافظه پاک می‌شود تا شکستِ شبکه برای همیشه ماندگار نشود.
           بدونِ این، یک قطعیِ لحظه‌ای یعنی بازی تا بارگذاریِ کاملِ صفحه
           دیگر هیچ‌وقت کلیپ نمی‌گیرد. */
        bundleCache.delete(url);
        throw error;
      });
    bundleCache.set(url, pending);
  }
  return pending;
}

/** پیش‌بارگذاری برای پردهٔ بارگذاری — تا کلیپ‌ها و مدل با هم بیایند. */
export function preloadClips(url: string = CLIPS_URL): void {
  void loadClipBundle(url).catch(() => {});
}

/* ── تبدیلِ بسته به کلیپ ──────────────────────────────────────────────────── */

/** نامِ کلیپِ مدل را برای مقایسه ساده می‌کند («Armature|mixamo.com|Layer0» → «armaturemixamocomlayer0»). */
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * کلیپ‌های نهایی را می‌سازد: اول از مدل، بعد از بسته.
 *
 * ⚠️ کلیپ‌های مدل با `AnimationClip.clone()` برداشته نمی‌شوند و همان شیء
 * به‌کار می‌رود — کلیپ فقط *داده* است و `AnimationMixer` آن را عوض نمی‌کند،
 * پس چند نمونه از شخصیت هم می‌توانند یک کلیپ را با هم داشته باشند.
 */
export function resolveClips(modelAnimations: readonly THREE.AnimationClip[], bundle: ClipBundle): ClipSet {
  const names: ClipName[] = ["idle", "run", "victory", "hit"];
  const set: ClipSet = {};

  const fromModel = new Map<string, THREE.AnimationClip>();
  for (const clip of modelAnimations) {
    /* ⚠️ کلیپ‌های زائدِ میکسامو («…|Layer0»، دو کلیدفریم، ۰٫۰۶۷ ثانیه) کنار
       گذاشته می‌شوند. اگر رد می‌شدند، یک مدلِ بی‌انیمیشن می‌توانست ادعا کند
       «idle» دارد و شخصیت بی‌حرکت می‌ماند بدونِ آنکه خطایی دیده شود. */
    if (clip.duration < 0.2) continue;
    fromModel.set(normalize(clip.name), clip);
  }

  for (const name of names) {
    const own = fromModel.get(name);
    if (own) {
      set[name] = { clip: own, loop: name !== "hit" && name !== "victory", origin: "model" };
      continue;
    }
    const entry = bundle.clips?.[name];
    if (!entry) continue;
    try {
      set[name] = {
        clip: THREE.AnimationClip.parse(entry.clip),
        loop: entry.loop,
        origin: "bundle",
      };
    } catch {
      /* یک کلیپِ خراب نباید کلِ شخصیت را از کار بیندازد. */
    }
  }

  return set;
}

/**
 * جایگزینِ امن وقتی یک حرکت وجود ندارد.
 *
 * بازی هیچ‌وقت نباید به‌خاطرِ نبودِ یک کلیپ متوقف شود: نبودِ `victory` یعنی
 * جشن با `idle` گرفته می‌شود که ساکت است ولی درست، و نبودِ `run` یعنی شخصیت
 * سُر می‌خورد ولی دور تمام می‌شود.
 */
export function pickClip(set: ClipSet, name: ClipName): ResolvedClip | null {
  if (set[name]) return set[name]!;
  const fallbacks: Record<ClipName, ClipName[]> = {
    idle: [],
    run: ["idle"],
    victory: ["idle"],
    hit: ["idle"],
  };
  for (const alt of fallbacks[name]) {
    if (set[alt]) return set[alt]!;
  }
  return null;
}
