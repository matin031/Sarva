"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * «صحنه واقعاً آماده است» — یک بار، برای هر دور.
 *
 * ⚠️ چرا `onCreated` کافی نیست: آن فقط می‌گوید *رندرر* ساخته شد. در همان
 * لحظه هنوز هیچ مدلی بارگذاری نشده، `Suspense` حل نشده، و حتی یک فریم هم
 * کشیده نشده. شمارشِ معکوس که به آن تکیه کند، ممکن است روی صفحه‌ای خالی
 * بشمارد و بازی را وقتی شروع کند که کاربر هنوز چیزی ندیده.
 *
 * این کامپوننت *داخلِ* مرزِ `Suspense` می‌نشیند. یعنی صرفِ mount شدنش یعنی
 * همهٔ چیزهایی که آن مرز منتظرشان بود حل شده‌اند. بعد یک `useFrame` صبر
 * می‌کند تا واقعاً یک فریم کشیده شود، و تازه آن‌وقت خبر می‌دهد.
 *
 * دو محافظ:
 *
 *   • `done` — فقط یک بار خبر می‌دهد. `useFrame` هر فریم اجرا می‌شود و
 *     بدونِ این، هر فریم یک `setState` می‌فرستاد.
 *   • تمیزکاری — اگر پیش از رسیدنِ فریم unmount شد (خروجِ کاربر، شروعِ
 *     دوباره)، هیچ callbackی شلیک نمی‌شود.
 */
export default function SceneReady({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  const alive = useRef(true);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useFrame(() => {
    if (done.current || !alive.current) return;
    // ⚠️ `render.frame` شمارندهٔ فریم‌های *واقعاً کشیده‌شده* است. اولین
    // فراخوانیِ useFrame می‌تواند پیش از اولین draw رخ دهد؛ این شرط تضمین
    // می‌کند دستِ‌کم یک تصویر روی بوم نشسته باشد.
    if (gl.info.render.frame < 1) return;
    done.current = true;
    onReady();
  });

  return null;
}
