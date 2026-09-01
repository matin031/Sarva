"use client";

import { useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** «این دستگاه صحنهٔ سه‌بعدی را تحمل می‌کند یا نه؟»
 *
 *  یک بازیِ درسی نباید روی گوشیِ ارزانِ یک دانش‌آموز کند شود تا روی لپ‌تاپِ
 *  یک نفرِ دیگر قشنگ‌تر باشد. پس لایهٔ WebGL اختیاری است و تصمیمش *یک‌بار*
 *  و پیش از ساختِ صحنه گرفته می‌شود.
 *
 *  چرا سنجشِ زندهٔ FPS نه: تا وقتی افت را اندازه بگیریم، کاربر همان افت را
 *  دیده است. این‌ها را پیش از رندر می‌شود دانست. */

export type RenderTier = "rich" | "lite";

/** پاسخِ WebGL2 یک‌بار گرفته و نگه داشته می‌شود؛ ساختنِ context گران است و
 *  تعدادشان در مرورگر محدود. */
let webglAnswer: boolean | null = null;

function hasWebGL(): boolean {
  if (webglAnswer !== null) return webglAnswer;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webglAnswer = Boolean(gl);
    // context را صریح آزاد می‌کنیم؛ رها کردنش یکی از سهمیهٔ محدودِ مرورگر را
    // تا زمانِ GC اشغال نگه می‌دارد.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return webglAnswer;
  } catch {
    webglAnswer = false;
    return false;
  }
}

interface DeviceNavigator extends Navigator {
  deviceMemory?: number;
}

/** فقط سخت‌افزار — ترجیحِ حرکت جداگانه سنجیده می‌شود چون می‌تواند عوض شود. */
function hardwareTier(): RenderTier {
  if (typeof window === "undefined") return "lite";
  if (!hasWebGL()) return "lite";

  const nav = navigator as DeviceNavigator;

  /* `deviceMemory` فقط در مرورگرهای کرومیوم هست و گِرد شده می‌آید. نبودنش
     دلیلِ ضعف نیست (سافاری هیچ‌وقت نمی‌دهد)، پس فقط وقتی *هست و کم است*
     تصمیم می‌گیریم. */
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return "lite";

  /* دو هسته یا کمتر: معمولاً گوشیِ پایین‌ردهٔ قدیمی. */
  const cores = nav.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 2) return "lite";

  return "rich";
}

/** بین رندرها ثابت می‌ماند: نتیجه به ورودیِ کاربر بستگی ندارد و عوض‌شدنش
 *  وسطِ بازی یعنی از نو ساختنِ صحنه. */
let hardwareAnswer: RenderTier | null = null;

function subscribe(): () => void {
  // سخت‌افزار عوض نمی‌شود؛ هیچ اشتراکی لازم نیست.
  return () => {};
}

function getSnapshot(): RenderTier {
  if (hardwareAnswer === null) hardwareAnswer = hardwareTier();
  return hardwareAnswer;
}

/** روی سرور همیشه «سبک»: نسخهٔ سبک بدونِ WebGL کار می‌کند، پس اگر کلاینت
 *  بعداً «غنی» شد فقط چیزی *اضافه* می‌شود — نه اینکه چیزی بشکند. */
const getServerSnapshot = (): RenderTier => "lite";

export function useRenderTier(): RenderTier {
  const reducedMotion = usePrefersReducedMotion();
  const hardware = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* کاهشِ حرکت یعنی «حرکت کمتر»، نه «تصویرِ بدتر». ولی صحنهٔ سه‌بعدیِ ما
     ذاتاً متحرک است — نورِ نفس‌کشنده، جریانِ روی سیم — و بی‌حرکت‌کردنش چیزی
     جز هزینهٔ GPU باقی نمی‌گذارد. پس در این حالت همان لایهٔ سبک درست‌تر است. */
  return reducedMotion ? "lite" : hardware;
}

/** برای آزمون: اجازهٔ تحمیلِ رده از بیرون، بدونِ دست‌کاریِ سخت‌افزار. */
export function forceRenderTierForTests(tier: RenderTier | null): void {
  hardwareAnswer = tier;
}
