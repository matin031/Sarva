"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneFrame } from "@/lib/poets-shelf/layout";

/* ═══════════════════════════════════════════════════════════════════════════
   دوربین — ترکیب‌بندی، واکنشِ به اندازهٔ صفحه، و تکان.
   ═══════════════════════════════════════════════════════════════════════════

   ── چرا ترکیب‌بندی با نسبتِ تصویر عوض می‌شود ─────────────────────────────

   کوچک‌کردنِ بوم با CSS، *همان* قاب را فشرده می‌کند. روی گوشیِ عمودی یعنی
   کتاب‌های کناری از کادر بیرون می‌زنند و شخصیت از پایین بریده می‌شود —
   چیزی که هیچ مقدارِ `object-fit` درستش نمی‌کند.

   راهِ درست، عوض‌کردنِ خودِ *ترکیب‌بندیِ سه‌بعدی* است: دوربین عقب می‌رود و
   میدانِ دید باز می‌شود. عددهایش در `layout.ts` و کنارِ بقیهٔ هندسه‌اند، نه
   اینجا — چون همان‌جاست که فاصلهٔ کتاب‌ها هم از رویشان حساب می‌شود و آن دو
   هرگز نباید از هم جدا بیفتند.

   ── چرا میان‌یابی و نه نشاندنِ مستقیم ────────────────────────────────────

   چرخاندنِ گوشی یا بازکردنِ صفحه‌کلیدِ مجازی، نسبتِ تصویر را *پیوسته* عوض
   می‌کند. نشاندنِ مستقیمِ مقدارها یعنی دوربین می‌پرد. میان‌یابیِ نمایی هم
   نرم است و هم به فریم‌ریت وابسته نیست.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface GameCameraProps {
  /* ⚠️ قاب *داده* می‌شود و اینجا حساب نمی‌شود. همان قاب، فاصلهٔ کتاب‌ها را
     هم تعیین می‌کند؛ اگر هر کدام جداگانه حسابش می‌کردند، دو منبعِ حقیقت
     داشتیم که می‌توانستند یک فریم از هم عقب بیفتند — و آن یعنی کتابی که
     لحظه‌ای بیرونِ کادر می‌افتد. */
  frame: SceneFrame;
  /** لحظهٔ آخرین برخورد (`performance.now`)، به‌صورتِ ref — نگاه کنید به `Burst`. */
  shakeAt: React.RefObject<number>;
  /** ۰ تا ۱. */
  shakeStrength: number;
  reducedMotion: boolean;
}

const SHAKE_MS = 420;

export function GameCamera({ frame, shakeAt, shakeStrength, reducedMotion }: GameCameraProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  /* شیءهای موقتِ مشترک — هیچ برداری در `useFrame` تخصیص نمی‌شود. */
  const scratch = useMemo(
    () => ({
      base: new THREE.Vector3(),
      target: new THREE.Vector3(),
      look: new THREE.Vector3(),
    }),
    [],
  );

  const settled = useRef(false);

  /* اولین قاب *بدونِ* میان‌یابی نشانده می‌شود: صحنه نباید با یک حرکتِ
     ناخواستهٔ دوربین باز شود. */
  useEffect(() => {
    settled.current = false;
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    scratch.target.set(...frame.cameraPosition);
    scratch.look.set(...frame.cameraTarget);

    if (!settled.current) {
      scratch.base.copy(scratch.target);
      camera.fov = frame.fov;
      settled.current = true;
    } else {
      /* ⚠️ `1 - exp(-k·dt)` و نه یک ضریبِ ثابت: ضریبِ ثابت روی نمایشگرِ
         ۱۲۰ هرتز دو برابرِ سریع‌تر همگرا می‌شود. این فرمول از نرخِ فریم
         مستقل است. */
      const k = 1 - Math.exp(-6 * delta);
      scratch.base.lerp(scratch.target, k);
      camera.fov += (frame.fov - camera.fov) * k;
    }

    /* ── تکانِ دوربین ───────────────────────────────────────────────────────
       فقط هنگامِ کوبیده‌شدنِ کتاب، و کوتاه. دامنه‌اش نمایی می‌خوابد، چون
       تکانی که خطی محو شود شبیهِ لرزش است و نه ضربه.

       دو بسامدِ نامرتبط روی دو محور، تا حرکت الگوی تکراری نگیرد. */
    let shakeX = 0;
    let shakeY = 0;
    if (!reducedMotion && shakeAt.current > 0) {
      const elapsed = performance.now() - shakeAt.current;
      if (elapsed >= 0 && elapsed < SHAKE_MS) {
        const t = elapsed / SHAKE_MS;
        const decay = Math.exp(-4.2 * t) * shakeStrength;
        shakeX = Math.sin(elapsed * 0.075) * 0.05 * decay;
        shakeY = Math.sin(elapsed * 0.108 + 1.1) * 0.038 * decay;
      }
    }

    camera.position.set(scratch.base.x + shakeX, scratch.base.y + shakeY, scratch.base.z);
    camera.lookAt(scratch.look);
    camera.updateProjectionMatrix();
  });

  return null;
}
