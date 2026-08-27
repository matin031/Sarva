"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  BRIDGE_Y,
  LANE_OFFSET,
  STEP_DEPTH,
  TILE_DEPTH,
  TILE_WIDTH,
} from "@/lib/aruz-bridge/layout";
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

/* دوربین نسبت به قبل کمی *بالاتر* و نزدیک‌تر آمده. دلیلش مستقیماً به
   نوشته‌شدنِ وزن‌ها روی خودِ شیشه برمی‌گردد: هرچه زاویهٔ دید به سطحِ کاشی
   مورب‌تر باشد، متن در راستای عمق بیشتر فشرده می‌شود. زاویهٔ بازتر یعنی متنِ
   خواناتر، بی‌آنکه نمای سه‌چهارم به نمای بالا-پایین تبدیل شود. */
const CAMERA_HEIGHT = 3.2;
const CAMERA_BACK = 3.6;
const LATERAL_FOLLOW = 0.35;
/* دوربین به *مرکزِ ثقلِ چیزهایی که باید دیده شوند* نگاه می‌کند، نه به نقطه‌ای
   با فاصلهٔ ثابت جلوترِ بازیکن.

   فرقش را روی صفحه می‌شود دید: با نگاهِ ثابتِ رو به جلو، بازیکن و هر دو کاشی
   همگی *زیرِ* محورِ دید می‌افتادند و کلِ نیمهٔ بالای کادر مه و تهی بود — همان
   حسِ «کج و ناجور» بودنِ ترکیب‌بندی. با نگاه به مرکزِ ثقل، محتوا وسط می‌نشیند.

   `LOOK_BIAS` بعد از آن، کادر را کمی پایین می‌آورد تا بالای تصویر برای HUD
   خالی بماند و واژهٔ پرسش روی خودِ پل نیفتد. */
const LOOK_BIAS = 0.45;

/* ═══ کادربندیِ خودکار ═════════════════════════════════════════════════════
   دوربین دیگر «فلان‌قدر جلوتر را نگاه کن» نیست؛ صریحاً *چیزهایی را که باید
   دیده شوند* در کادر نگه می‌دارد.

   چرا عوض شد: هر ثابتی — چه زاویهٔ دید، چه عرضِ ثابتِ کادر — فقط برای نسبتِ
   تصویری‌ای درست است که با آن کوک شده. روی گوشیِ عمودی (۰٫۴۶) میدانِ دیدِ
   افقی جمع می‌شد و کاشیِ چپ بیرون می‌افتاد؛ روی گوشیِ *افقی* (نسبتِ ۳٫۸، چون
   ارتفاعِ کادر فقط ۲۲۲ پیکسل است) برعکس، میدانِ عمودی ته می‌کشید و خودِ
   بازیکن از پایینِ کادر بیرون می‌زد.

   حالا هر فریم چند نقطهٔ کلیدی به فضای دوربین برده می‌شوند و زاویهٔ دید از
   روی دورترینشان حساب می‌شود. یعنی تضمین — نه تنظیم — که این‌ها همیشه دیده
   می‌شوند:

     • بازیکن (از پا تا بالای سر)
     • هر دو کاشیِ گزینه، تا لبهٔ دورشان
     • وزنی که روی هر کاشی نوشته شده

   هیچ عددی به نسبتِ تصویری گره نخورده، پس روی هر صفحه‌ای — و در هر
   چرخشِ گوشی — ترکیب‌بندی همان می‌ماند. */
const FOV_MIN = 34;
const FOV_MAX = 86;
/** حاشیهٔ اطراف — کادرِ چسبیده به اشیا خفه به نظر می‌رسد. */
const FRAME_MARGIN = 1.15;
/** بالای سرِ بازیکن، برای اینکه کادر سرش را نبُرد. */
const PLAYER_TOP = 1.25;

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
  const lookAt = useRef(new THREE.Vector3(0, 0.8, -2.6));
  const desired = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const shake = useRef(new THREE.Vector3());
  /* اشیای کمکی، یک بار ساخته می‌شوند. تخصیصِ حافظه در حلقهٔ فریم یعنی کارِ
     مدام برای زباله‌روب و پرش‌های ریز در نرخِ فریم. */
  const view = useRef(new THREE.Matrix4());
  const scratch = useRef(new THREE.Vector3());
  const framePoints = useRef(Array.from({ length: 6 }, () => new THREE.Vector3()));
  const centroid = useRef(new THREE.Vector3());
  /** ارتفاعِ سطحِ پل، تا دوربین هنگامِ سقوط همان‌جا بماند. */
  const bridgeLevel = useRef(BRIDGE_Y);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dt = Math.min(delta, 0.05);
    const p = targetRef.current;

    /* نقاطی که ترکیب‌بندی حولِ آن‌ها بسته می‌شود: بازیکن (از پا تا بالای سر)
       و چهار گوشهٔ دو کاشیِ گزینه. هم مرکزِ نگاه از این‌ها می‌آید، هم زاویهٔ
       دید — پس «دیده‌شدن»شان محاسبه‌شده است، نه تنظیم‌شده. */
    const zAhead = p.z - STEP_DEPTH;
    const halfW = LANE_OFFSET + TILE_WIDTH / 2;
    const farZ = zAhead - TILE_DEPTH / 2;
    const nearZ = zAhead + TILE_DEPTH / 2;
    framePoints.current[0].set(p.x, p.y, p.z);
    framePoints.current[1].set(p.x, p.y + PLAYER_TOP, p.z);
    framePoints.current[2].set(-halfW, BRIDGE_Y, farZ);
    framePoints.current[3].set(halfW, BRIDGE_Y, farZ);
    framePoints.current[4].set(-halfW, BRIDGE_Y, nearZ);
    framePoints.current[5].set(halfW, BRIDGE_Y, nearZ);

    centroid.current.set(0, 0, 0);
    for (const point of framePoints.current) centroid.current.add(point);
    centroid.current.divideScalar(framePoints.current.length);

    switch (mode) {
      case "jump":
        // کمی جلو می‌آید تا حرکت حس شود، ولی نه آن‌قدر که حالت تهوع بیاورد
        desired.current.set(p.x * LATERAL_FOLLOW, bridgeLevel.current + CAMERA_HEIGHT, p.z + CAMERA_BACK - 0.4);
        desiredLook.current.set(centroid.current.x, centroid.current.y + LOOK_BIAS, centroid.current.z);
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
        desiredLook.current.set(centroid.current.x, centroid.current.y + LOOK_BIAS, centroid.current.z);
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

    /* ── زاویهٔ دید را از روی نقاطی که باید دیده شوند حساب کن ──────────
       هنگامِ سقوط این کار متوقف می‌شود: بازیکن ده‌ها متر پایین می‌رود و
       دنبال‌کردنش یعنی دوربین تا بی‌نهایت زوم بیرون می‌رود. */
    if (mode === "gameplay" || mode === "jump") {
      camera.updateMatrixWorld();
      view.current.copy(camera.matrixWorld).invert();

      let vHalf = 0;
      let hHalf = 0;
      for (const point of framePoints.current) {
        scratch.current.copy(point).applyMatrix4(view.current);
        // دوربین در فضای دید به سمتِ ‎-z نگاه می‌کند؛ نقاطِ پشتِ سر بی‌معنی‌اند.
        const depth = -scratch.current.z;
        if (depth < 0.2) continue;
        vHalf = Math.max(vHalf, Math.atan(Math.abs(scratch.current.y) / depth));
        hHalf = Math.max(hHalf, Math.atan(Math.abs(scratch.current.x) / depth));
      }

      // نیازِ افقی را به زبانِ زاویهٔ عمودی ترجمه کن، چون fov عمودی است.
      const fromHorizontal = 2 * Math.atan(Math.tan(hHalf) / camera.aspect);
      const needed = THREE.MathUtils.radToDeg(Math.max(2 * vHalf, fromHorizontal));
      const fov = THREE.MathUtils.clamp(needed * FRAME_MARGIN, FOV_MIN, FOV_MAX);

      // میرایی، تا تغییرِ نسبت یا پرش باعثِ جهشِ ناگهانیِ زوم نشود
      const next = THREE.MathUtils.damp(camera.fov, fov, 6, dt);
      // ماتریسِ تصویر گران است؛ فقط وقتی تغییرِ معنادار باشد بازسازی می‌شود.
      if (Math.abs(camera.fov - next) > 0.05) {
        camera.fov = next;
        camera.updateProjectionMatrix();
      }
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
