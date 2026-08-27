import * as THREE from "three";
import type { QualitySettings, QualityTier } from "@/lib/aruz-bridge/quality";

/* ═══════════════════════════════════════════════════════════════════════════
   شیشه — مهم‌ترین عنصرِ دیداریِ بازی.
   ═══════════════════════════════════════════════════════════════════════════

   هدف این است که در نگاهِ اول حسِ «شیشهٔ ضخیمِ تحمل‌کنندهٔ وزنِ آدم» بدهد، نه
   یک جعبهٔ آبیِ شفاف. چیزی که این حس را می‌سازد چند چیزِ کنارِ هم است:

     • transmission به‌جای opacity — نور از شیشه *عبور* می‌کند و پشتِ آن را
       با شکستِ نور می‌بینیم، نه اینکه رنگ‌ها با هم مخلوط شوند.
     • ior حدودِ ۱٫۵ — همان ضریبِ شکستِ شیشهٔ واقعیِ سیلیکاتی.
     • thickness برابرِ ضخامتِ واقعیِ هندسه، تا رنگ‌گیریِ حجمی درست باشد.
     • roughness کم ولی *ناصفر* — شیشهٔ کاملاً صیقلی مصنوعی به نظر می‌رسد.
     • clearcoat — لایهٔ بازتابِ سطحی که لبه‌ها را پیدا می‌کند.
     • envMapIntensity بالا — بدونِ چیزی برای بازتاب‌دادن، شیشه دیده نمی‌شود.

   روی دستگاهِ ضعیف transmission کنار گذاشته می‌شود (هر کاشی وگرنه یک پاسِ
   رندرِ جداگانه می‌خواهد) و جایش شفافیتِ ساده می‌نشیند؛ ولی رنگ، زبری،
   clearcoat و بازتابِ محیطی سرِ جایشان می‌مانند، پس کیفیتِ دسکتاپ به سطحِ
   ضعیف‌ترین گوشی پایین کشیده نمی‌شود.

   نکته: هزینهٔ transmission با `renderer.transmissionResolutionScale` کنترل
   می‌شود، نه با خودِ ماده — این تنظیم در three روی *رندرر* است. جایش در
   `GameCanvas` هنگامِ ساختِ رندرر است.

   ── چرا ماده‌ها در سطحِ ماژول کَش می‌شوند ──────────────────────────────────
   همهٔ کاشی‌های یک دور دقیقاً یک ظاهر دارند و هیچ‌کدام خصوصیتِ *مخصوصِ خودش*
   را در زمانِ اجرا عوض نمی‌کند (ظاهرشدن از دور را مه انجام می‌دهد، نه شفافیتِ
   ماده). پس یک نمونه به‌ازای هر پلهٔ کیفیت کافی است — همان الگویی که
   `components/UI/galaxy/GalaxyScene.tsx` برای هندسه‌های مشترکش به‌کار می‌برد.
   سودش دوتاست: هر ماده یک بار روی GPU کامپایل می‌شود نه به‌ازای هر کاشی، و
   قطعاتِ شکسته همان مادهٔ شیشه را به ارث می‌برند، پس حینِ سقوط هم نورِ محیط
   را می‌گیرند.
   ═══════════════════════════════════════════════════════════════════════════ */

const glassCache = new Map<string, THREE.MeshPhysicalMaterial>();

export function getGlassMaterial(
  quality: QualitySettings,
  thickness: number,
): THREE.MeshPhysicalMaterial {
  const key = `${quality.tier}:${thickness}`;
  const cached = glassCache.get(key);
  if (cached) return cached;

  const useTransmission = quality.useTransmission;
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#cfe9ec"),
    metalness: 0,
    roughness: 0.075,
    ior: 1.49,
    reflectivity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.055,
    envMapIntensity: useTransmission ? 1.5 : 2.1,

    transmission: useTransmission ? 0.94 : 0,
    thickness,
    // رنگ‌گیریِ حجمی: هرچه نور مسیرِ بلندتری در شیشه برود، سبزآبی‌تر می‌شود —
    // همان چیزی که لبهٔ شیشهٔ ضخیم را سبز نشان می‌دهد.
    attenuationColor: new THREE.Color("#7fd3d6"),
    attenuationDistance: 0.9,

    // بدونِ transmission، شفافیت باید دستی بیاید وگرنه کاشی یک جعبهٔ ماتِ آبی است.
    transparent: !useTransmission,
    opacity: useTransmission ? 1 : 0.34,
    side: THREE.FrontSide,
    depthWrite: useTransmission,
  });

  glassCache.set(key, material);
  return material;
}

/** مادهٔ لبه — یک خطِ نازکِ فیروزه‌ای که مرزِ شیشه را قطعی می‌کند. */
const EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: new THREE.Color("#8fe9ec"),
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});

export function getEdgeMaterial(): THREE.LineBasicMaterial {
  return EDGE_MATERIAL;
}

/** فقط برای پاک‌سازیِ آزمایشی؛ در عمل ماده‌ها تا پایانِ عمرِ صفحه می‌مانند. */
export function disposeGlassMaterials(tier?: QualityTier): void {
  for (const [key, material] of glassCache) {
    if (tier && !key.startsWith(`${tier}:`)) continue;
    material.dispose();
    glassCache.delete(key);
  }
}
