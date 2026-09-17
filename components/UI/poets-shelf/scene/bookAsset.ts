"use client";

import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   دارایی‌های کتاب — یک بار بارگذاری، بینِ همهٔ کتاب‌ها مشترک.
   ═══════════════════════════════════════════════════════════════════════════

   مدلِ کتاب ۵۲ مثلث دارد. `scripts/poets-shelf/build-book-geometry.mjs` آن را
   به سه آرایهٔ عدد تبدیل کرده (۸ کیلوبایت) تا `FBXLoader` — که خودش چند برابرِ
   این حجم است — اصلاً به مرورگر فرستاده نشود.

   بافت هم از PNGِ ۲۰۰۰×۲۰۰۰ و ۴٫۶ مگابایتی به WebPِ ۱۰۲۴ و ۹۵ کیلوبایتی
   رفته (کانالِ آلفایش کاملاً مات بود و حذف شد).

   ⚠️ مالکیت: این ماژول *صاحبِ* هندسه و بافت است و هیچ کامپوننتی نباید
   `dispose` صدا بزند. پنج کتابِ صحنه همگی همین یک هندسه و همین یک بافت را
   به‌کار می‌برند؛ آزادکردنش از داخلِ یکی از آن‌ها، بقیه را خالی می‌کرد —
   دقیقاً همان دامی که هنگامِ برچیده‌شدنِ صحنه به‌نظر بی‌خطر می‌رسد.
   ═══════════════════════════════════════════════════════════════════════════ */

const GEOMETRY_URL = "/games/game-assets/book/book-geometry.json";
const TEXTURE_URL = "/games/game-assets/book/OldBook001_tex.webp";

export interface BookAsset {
  geometry: THREE.BufferGeometry;
  texture: THREE.Texture;
  /** ابعادِ خامِ مدل — مبنای مقیاسِ صحنه در `layout.ts`. */
  size: { x: number; y: number; z: number };
}

interface GeometryPayload {
  size: { x: number; y: number; z: number };
  position: number[];
  normal: number[];
  uv: number[];
}

let pending: Promise<BookAsset> | null = null;

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        /* کتاب از زاویهٔ مورب و در دوردست دیده می‌شود؛ بدونِ این، جلدش
           در فاصله سوسو می‌زند. */
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => reject(new Error("بارگذاریِ بافتِ کتاب شکست خورد.")),
    );
  });
}

export function loadBookAsset(): Promise<BookAsset> {
  if (pending) return pending;

  pending = (async () => {
    const [payload, texture] = await Promise.all([
      fetch(GEOMETRY_URL).then((res) => {
        if (!res.ok) throw new Error(`بارگذاریِ هندسهٔ کتاب شکست خورد (${res.status})`);
        return res.json() as Promise<GeometryPayload>;
      }),
      loadTexture(TEXTURE_URL),
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(payload.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(payload.normal, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(payload.uv, 2));
    /* کرهٔ محیطی برای حذفِ خارج از دید لازم است. بدونِ آن three هر فریم
       خودش حسابش می‌کند و برای هر پنج کتاب تکرار می‌شود. */
    geometry.computeBoundingSphere();

    return { geometry, texture, size: payload.size };
  })().catch((error) => {
    // شکستِ شبکه نباید تا بارگذاریِ کاملِ صفحه ماندگار شود.
    pending = null;
    throw error;
  });

  return pending;
}

/** پیش‌بارگذاری برای پردهٔ بارگذاری. */
export function preloadBookAsset(): void {
  void loadBookAsset().catch(() => {});
}
