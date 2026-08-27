"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { BRIDGE_Y } from "@/lib/aruz-bridge/layout";
import type { CameraMode } from "@/lib/aruz-bridge/types";

/* دوربینِ سومْ‌شخصِ سه‌چهارم.
 *
 * ترکیب‌بندی باید هم‌زمان چهار چیز را در کادر نگه دارد: خودِ بازیکن، هر دو
 * شیشهٔ بعدی، متنِ هر دو گزینه، و کمی از مسیرِ پیشِ رو. برای همین دوربین
 * *کاملاً* پشتِ سرِ بازیکن نمی‌ماند و فقط کسری از جابه‌جاییِ افقیِ او را
 * دنبال می‌کند (`LATERAL_FOLLOW`)؛ اگر کامل دنبال می‌کرد، بعد از هر پرش یکی
 * از دو شیشهٔ بعدی به لبهٔ کادر می‌رفت و از دیگری بزرگ‌تر دیده می‌شد.
 *
 * دوربین هیچ‌وقت نمی‌داند پاسخ درست بوده یا غلط. فقط «حالت» می‌گیرد. */

const CAMERA_HEIGHT = 3.05;
const CAMERA_BACK = 5.2;
const LATERAL_FOLLOW = 0.35;
/** چقدر جلوترِ بازیکن را نگاه کند — همین عمقِ مسیر را نشان می‌دهد. */
const LOOK_AHEAD = 2.8;

/* عرضی از دنیا که *همیشه* باید در کادر باشد: دو کاشی (مرکزهایشان ۲٫۱ متر از
   هم) به‌علاوهٔ برچسب‌هایشان و کمی حاشیه.

   دلیلِ وجودِ این ثابت: `fov` در three عمودی است. روی نمایشگرِ بلند و باریکِ
   موبایل (نسبتِ ~۰٫۴۶)، یک fovِ عمودیِ ثابت یعنی میدانِ دیدِ *افقی* به‌شدت
   تنگ می‌شود — و برچسبِ شیشهٔ چپ از لبهٔ صفحه بیرون می‌افتد. با ثابت‌نگه‌داشتنِ
   عرضِ کادر به‌جای زاویهٔ عمودی، ترکیب‌بندی روی هر نسبتی درست می‌ماند. */
const FRAME_WIDTH = 5.6;
const FOV_MIN = 42;
const FOV_MAX = 88;

interface GameCameraProps {
  /** ref و نه مقدار: موقعیتِ بازیکن هر فریم عوض می‌شود. */
  targetRef: RefObject<THREE.Vector3>;
  mode: CameraMode;
  followSpeed: number;
  /** ۰..۱ — شدتِ ضربهٔ لحظهٔ ترک‌خوردن. ref است چون هر فریم افت می‌کند. */
  impulseRef: RefObject<number>;
  reducedMotion: boolean;
}

export function GameCamera({ targetRef, mode, followSpeed, impulseRef, reducedMotion }: GameCameraProps) {
  /* دوربین را خودمان می‌سازیم و ref می‌گیریم، به‌جای دست‌کاریِ دوربینِ
     پیش‌فرضِ صحنه. `makeDefault` باعث می‌شود R3F همین را دوربینِ فعال بداند. */
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const lookAt = useRef(new THREE.Vector3(0, 0.8, -LOOK_AHEAD));
  const desired = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const shake = useRef(new THREE.Vector3());
  /** ارتفاعِ سطحِ پل، تا دوربین هنگامِ سقوط همان‌جا بماند. */
  const bridgeLevel = useRef(BRIDGE_Y);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dt = Math.min(delta, 0.05);
    const p = targetRef.current;

    switch (mode) {
      case "jump":
        // کمی جلو می‌آید تا حرکت حس شود، ولی نه آن‌قدر که حالت تهوع بیاورد
        desired.current.set(p.x * LATERAL_FOLLOW, bridgeLevel.current + CAMERA_HEIGHT, p.z + CAMERA_BACK - 0.5);
        desiredLook.current.set(p.x * 0.45, p.y + 0.85, p.z - LOOK_AHEAD);
        break;

      case "fall":
        /* دوربین *پایین نمی‌رود*. نزدیکِ سطحِ پل می‌ماند و فقط سرش را کمی
           خم می‌کند؛ بازیکن در عمق کوچک می‌شود و از کادر می‌رود. همین است که
           حسِ ارتفاع می‌دهد — اگر دوربین همراهش می‌افتاد، سقوط بی‌وزن می‌شد. */
        desired.current.set(p.x * 0.3, bridgeLevel.current + CAMERA_HEIGHT - 0.3, p.z + CAMERA_BACK - 0.9);
        // نگاه فقط تا چند متر پایین را دنبال می‌کند و بعد رها می‌کند
        desiredLook.current.set(p.x * 0.5, Math.max(p.y, bridgeLevel.current - 5.5), p.z - 0.6);
        break;

      case "gameOver":
        desired.current.set(p.x * 0.25, bridgeLevel.current + CAMERA_HEIGHT + 0.4, p.z + CAMERA_BACK + 1);
        desiredLook.current.set(p.x * 0.3, bridgeLevel.current - 1.5, p.z - 1.5);
        break;

      default:
        bridgeLevel.current = p.y;
        desired.current.set(p.x * LATERAL_FOLLOW, p.y + CAMERA_HEIGHT, p.z + CAMERA_BACK);
        desiredLook.current.set(p.x * 0.45, p.y + 0.85, p.z - LOOK_AHEAD);
    }

    // میرایی مستقل از نرخِ فریم: روی ۳۰ و ۱۴۴ هرتز یک‌جور حرکت می‌کند
    const lambda = followSpeed;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.current.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.current.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.current.z, lambda, dt);

    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, desiredLook.current.x, lambda * 1.2, dt);
    lookAt.current.y = THREE.MathUtils.damp(lookAt.current.y, desiredLook.current.y, lambda * 1.2, dt);
    lookAt.current.z = THREE.MathUtils.damp(lookAt.current.z, desiredLook.current.z, lambda * 1.2, dt);

    /* ضربهٔ ترک‌خوردن: بسیار کوتاه و کوچک. عمداً «لرزشِ دوربین» نیست —
       هدف یک تکانِ محسوس است، نه ایجادِ حالتِ تهوع. با prefers-reduced-motion
       کاملاً خاموش می‌شود. */
    const amp = reducedMotion ? 0 : impulseRef.current * 0.055;
    if (amp > 0.0001) {
      shake.current.set(
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp,
        (Math.random() - 0.5) * amp * 0.5,
      );
      camera.position.add(shake.current);
    }

    camera.lookAt(lookAt.current);

    /* fov را طوری کوک کن که `FRAME_WIDTH` همیشه در کادر جا شود. روی نمایشگرِ
       پهن این تقریباً همان fovِ پایه است؛ روی موبایلِ عمودی خودش را باز
       می‌کند تا هر دو برچسب دیده شوند. */
    const distance = camera.position.distanceTo(lookAt.current);
    const neededHalfH = Math.atan(FRAME_WIDTH / 2 / Math.max(distance, 0.001));
    const neededFov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(neededHalfH) / camera.aspect),
    );
    const fov = THREE.MathUtils.clamp(neededFov, FOV_MIN, FOV_MAX);
    // ماتریسِ تصویر گران است؛ فقط وقتی تغییرِ معنادار باشد بازسازی می‌شود.
    if (Math.abs(camera.fov - fov) > 0.15) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={50}
      near={0.1}
      far={220}
      position={[0, CAMERA_HEIGHT, CAMERA_BACK]}
    />
  );
}
