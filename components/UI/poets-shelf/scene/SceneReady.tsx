"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * «صحنه واقعاً آماده است» — یک بار.
 *
 * ⚠️ چرا `onCreated` کافی نیست: آن فقط می‌گوید رندرر ساخته شد. در آن لحظه
 * هنوز مدلِ ۵٫۵ مگابایتیِ شخصیت نرسیده، `Suspense` حل نشده و حتی یک فریم هم
 * کشیده نشده. پردهٔ بارگذاری که به آن تکیه کند، کنار می‌رود و زیرش یک
 * صفحهٔ خالی می‌ماند.
 *
 * این کامپوننت *داخلِ* مرزِ `Suspense` می‌نشیند، پس صرفِ سوارشدنش یعنی هرچه
 * آن مرز منتظرش بود حل شده. بعد یک `useFrame` صبر می‌کند تا واقعاً چیزی روی
 * بوم بنشیند.
 *
 * همان الگوی `components/UI/aruz-bridge/scene/SceneReady.tsx`.
 */
export function SceneReady({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  const alive = useRef(true);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useFrame(() => {
    if (done.current || !alive.current) return;
    /* `render.frame` شمارندهٔ فریم‌های *واقعاً کشیده‌شده* است. اولین
       فراخوانیِ `useFrame` می‌تواند پیش از اولین draw رخ دهد. */
    if (gl.info.render.frame < 1) return;
    done.current = true;
    onReady();
  });

  return null;
}
