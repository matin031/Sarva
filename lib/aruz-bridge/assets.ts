/**
 * مسیرِ هر فایلی که بازی *می‌تواند* استفاده کند.
 *
 * هیچ‌کدام از این‌ها الزامی نیستند. بازی با فرضِ نبودنِ همه‌شان نوشته شده و
 * برای هرکدام یک جایگزینِ درون‌برنامه‌ای دارد:
 *
 *   player.glb          → کاراکترِ رویه‌ای (procedural) در `scene/Player.tsx`
 *   glass-fractured.glb → شکستِ رویه‌ایِ ورونوی در `fracture.ts`
 *   glass-crack.png     → ترک‌های هندسی (خطوطِ ورونوی) در `scene/CrackLines.tsx`
 *   environment.hdr     → نقشهٔ محیطیِ رویه‌ای در `scene/useProceduralEnv.ts`
 *   audio/*             → سکوت؛ کلِ توالیِ دیداری بدون صدا هم کامل اجرا می‌شود
 *
 * پیش از استفاده، `useOptionalAssets` وجودِ فایل را با یک درخواستِ HEAD
 * می‌سنجد، پس یک مسیرِ خالی هرگز به صورتِ استثنا در میانهٔ رندر ظاهر نمی‌شود.
 */
const BASE = "/games/aruz-bridge";

export const aruzBridgeAssets = {
  models: {
    player: `${BASE}/models/player.glb`,
    fracturedGlass: `${BASE}/models/glass-fractured.glb`,
  },
  textures: {
    glassCrack: `${BASE}/textures/glass-crack.png`,
  },
  environment: {
    hdri: `${BASE}/env/bridge.hdr`,
  },
  audio: {
    jump: `${BASE}/audio/jump.ogg`,
    landing: `${BASE}/audio/landing.ogg`,
    crack: `${BASE}/audio/glass-crack.ogg`,
    shatter: `${BASE}/audio/glass-shatter.ogg`,
    heartbeat: `${BASE}/audio/heartbeat.ogg`,
    correct: `${BASE}/audio/correct.ogg`,
    gameOver: `${BASE}/audio/game-over.ogg`,
  },
} as const;

export type AruzBridgeSoundName = keyof typeof aruzBridgeAssets.audio;

/** کلیدهایی که `useOptionalAssets` می‌سنجد. صدا جداگانه و تنبل سنجیده می‌شود. */
export type OptionalAssetKey =
  | "playerModel"
  | "fracturedGlass"
  | "crackTexture"
  | "hdri";

export const optionalAssetPaths: Record<OptionalAssetKey, string> = {
  playerModel: aruzBridgeAssets.models.player,
  fracturedGlass: aruzBridgeAssets.models.fracturedGlass,
  crackTexture: aruzBridgeAssets.textures.glassCrack,
  hdri: aruzBridgeAssets.environment.hdri,
};
