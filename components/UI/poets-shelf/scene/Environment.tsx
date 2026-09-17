"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  SHELF_DEPTH,
  SHELF_THICKNESS,
  SHELF_Y,
  WALL_HEIGHT,
  WALL_THICKNESS,
  WALL_WIDTH,
} from "@/lib/poets-shelf/layout";
import type { QualitySettings } from "@/lib/poets-shelf/quality";
import type { ScenePalette } from "@/lib/poets-shelf/theme";
import { NO_RAYCAST } from "./raycast";
import { createWallTextures } from "./wallTexture";

/* ═══════════════════════════════════════════════════════════════════════════
   محیط: دیوار، طاقچه، کف، و نور.
   ═══════════════════════════════════════════════════════════════════════════

   همه‌چیزِ ثابتِ صحنه اینجاست. هیچ‌کدام از این‌ها به حالتِ بازی نگاه نمی‌کنند،
   پس هیچ‌کدام با تغییرِ حالت دوباره رندر نمی‌شوند — فقط با تغییرِ تم.
   ═══════════════════════════════════════════════════════════════════════════ */

export function Environment({ palette, quality }: { palette: ScenePalette; quality: QualitySettings }) {
  /* بافت‌ها *فقط* با تغییرِ تم یا پلهٔ کیفیت دوباره ساخته می‌شوند. کشیدنشان
     چند میلی‌ثانیه طول می‌کشد، پس هرگز نباید در مسیرِ رندرِ عادی بیفتد. */
  const textures = useMemo(
    () => createWallTextures(palette, quality.wallTexture),
    [palette, quality.wallTexture],
  );

  /* ⚠️ بافتِ قبلی باید صراحتاً آزاد شود. بدونِ این، هر بار که کاربر تم یا
     پالت را عوض می‌کند دو بافتِ چند مگابایتی روی GPU جا می‌ماند — و کاربری
     که پالت‌ها را ورق می‌زند در چند ثانیه حافظه را پر می‌کند. */
  useEffect(() => () => textures.dispose(), [textures]);

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: textures.map,
        bumpMap: textures.bumpMap,
        /* ⚠️ عدد کوچک است و باید باشد. `bumpScale` در three از نسخهٔ ۱۵۲ به
           بعد مستقیم به‌کار می‌رود؛ مقدارهای بزرگ شیارِ بندکشی را به موجِ
           فلزی تبدیل می‌کنند. آنچه لازم است فقط کافی است که لبه‌ها نور را
           بگیرند. */
        bumpScale: 0.42,
        roughness: 0.94,
        metalness: 0,
      }),
    [textures],
  );

  const sideMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.wallEdge, roughness: 0.95, metalness: 0 }),
    [palette.wallEdge],
  );

  const shelfMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.shelf, roughness: 0.68, metalness: 0.04 }),
    [palette.shelf],
  );

  const floorMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 1, metalness: 0 }),
    [palette.floor],
  );

  useEffect(
    () => () => {
      wallMaterial.dispose();
      sideMaterial.dispose();
      shelfMaterial.dispose();
      floorMaterial.dispose();
    },
    [wallMaterial, sideMaterial, shelfMaterial, floorMaterial],
  );

  /* ترتیبِ وجوهِ `BoxGeometry` در three: ‎+x، −x، +y، −y، +z، −z‎.
     فقط وجهِ ‎+z‎ (اندیسِ ۴) بافتِ دیوار را می‌گیرد؛ بقیه رنگِ کنارهٔ ساده. */
  const wallMaterials = useMemo(
    () => [sideMaterial, sideMaterial, sideMaterial, sideMaterial, wallMaterial, sideMaterial],
    [sideMaterial, wallMaterial],
  );

  const dark = palette.dark;

  /* هدفِ چراغِ شب. یک `Object3D` خالی که فقط جای گرفتنش مهم است. */
  const spotTarget = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(0, SHELF_Y, 0);
    return object;
  }, []);

  return (
    <group>
      {/* ── دیوار ───────────────────────────────────────────────────────────
          جعبه و نه صفحه: ضخامتِ واقعی یعنی اگر قاب روزی بازتر شد، لبه‌اش
          یک خطِ بی‌ضخامت نباشد. دوازده مثلث، عملاً رایگان. */}
      <mesh
        position={[0, WALL_HEIGHT / 2, -WALL_THICKNESS / 2]}
        material={wallMaterials}
        receiveShadow={quality.shadows}
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* ── طاقچه ───────────────────────────────────────────────────────────
          رویه‌اش دقیقاً روی `SHELF_Y` می‌نشیند تا کتاب‌ها بدونِ هیچ نصفه‌ای
          در محلِ فراخوانی رویش بایستند. */}
      <mesh
        position={[0, SHELF_Y - SHELF_THICKNESS / 2, SHELF_DEPTH / 2]}
        material={shelfMaterial}
        castShadow={quality.shadows}
        receiveShadow={quality.shadows}
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[WALL_WIDTH * 0.88, SHELF_THICKNESS, SHELF_DEPTH]} />
      </mesh>

      {/* لبهٔ باریکِ جلوی طاقچه. یک جزئیاتِ کوچک ولی کاری: بدونِ آن طاقچه یک
          تختهٔ تخت بود؛ با آن، یک خطِ نورِ افقی می‌گیرد که عمقِ قفسه را
          نشان می‌دهد. */}
      <mesh
        position={[0, SHELF_Y - SHELF_THICKNESS - 0.012, SHELF_DEPTH - 0.012]}
        material={shelfMaterial}
        castShadow={false}
        raycast={NO_RAYCAST}
      >
        <boxGeometry args={[WALL_WIDTH * 0.88, 0.028, 0.03]} />
      </mesh>

      {/* ── کف ──────────────────────────────────────────────────────────────
          به‌عمد بسیار ساده: یک سطحِ کم‌رنگ که فقط سایه می‌گیرد. هرچه بیشتر
          از این، به یک سکوی تزئینی تبدیل می‌شد و کتاب‌ها را پس می‌زد.
          لبه‌هایش هیچ‌وقت دیده نمی‌شوند چون دیوار کلِ پهنای قاب را می‌گیرد. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 5]}
        material={floorMaterial}
        receiveShadow={quality.shadows}
        raycast={NO_RAYCAST}
      >
        <planeGeometry args={[26, 22]} />
      </mesh>

      {/* ══ نور ══════════════════════════════════════════════════════════════

          ⚠️ تمِ تیره اینجا «همان نور، کم‌نورتر» نیست.

          در تمِ روشن صحنه یک اتاقِ روشن است: نورِ محیطیِ بالا، یک نورِ اصلیِ
          نرم از بالا-چپ، و یک پرکنندهٔ سرد از راست که سیلوئتِ شخصیت را از
          دیوار جدا می‌کند.

          در تمِ تیره همان اتاق *شب* است: نورِ محیطی تا حدِ یک تهِ رنگ پایین
          می‌آید و به‌جایش یک چراغِ موضعی از بالای طاقچه روشن می‌شود — مثلِ
          چراغِ بالای قفسهٔ یک کتاب‌فروشی. نتیجه‌اش یک حوضچهٔ نور روی کتاب‌هاست
          و دیوار به سمتِ کناره‌ها در سایه می‌رود، که هم عمق می‌سازد و هم
          دقیقاً همان‌جا که باید، توجه را می‌برد.

          نشانِ حک‌شده در هر دو حالت خوانده می‌شود چون *برجستگی* آن را نور
          می‌سازد و نه رنگ — و هر دو چیدمان نورِ مورب دارند. */}

      <hemisphereLight
        args={[palette.keyLight, palette.floor, dark ? 0.32 : 1.05]}
      />

      <directionalLight
        position={[-3.4, 6.2, 5.4]}
        intensity={dark ? 0.55 : 1.5}
        color={palette.keyLight}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMap}
        shadow-mapSize-height={quality.shadowMap}
        /* ⚠️ محفظهٔ سایه تنگ بسته شده و این مهم‌ترین تنظیمِ کیفیتِ سایه است:
           با محفظهٔ پیش‌فرض (‎±۵‎) همان ۱۰۲۴ پیکسل روی ناحیه‌ای ده برابرِ
           لازم پخش می‌شد و سایهٔ پای شخصیت پلکانی درمی‌آمد. اینجا دقیقاً
           همان جایی پوشش داده می‌شود که چیزی در آن حرکت می‌کند. */
        shadow-camera-left={-4.2}
        shadow-camera-right={4.2}
        shadow-camera-top={4.4}
        shadow-camera-bottom={-1.2}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        /* اریبِ نرمال جداشدنِ سایه از پا را می‌گیرد بدونِ آنکه مثلِ اریبِ
           ساده سایه را از جسم بکند. */
        shadow-normalBias={0.028}
        shadow-bias={-0.0006}
      />

      {/* پرکنندهٔ مقابل. سایه نمی‌اندازد — کارش فقط این است که سمتِ تاریکِ
          شخصیت کاملاً سیاه نشود. */}
      <directionalLight position={[4.6, 2.4, 3.2]} intensity={dark ? 0.3 : 0.42} color={palette.fillLight} />

      {dark && (
        /* چراغِ بالای قفسه — فقط در شب. زاویه‌اش رو به پایین و کمی به جلوست
            تا هم کتاب‌ها روشن شوند و هم نشان روی دیوار برجستگی‌اش را نشان
            دهد. `penumbra` بالا یعنی لبهٔ حوضچه نرم است و به لکهٔ نورافکن
            تبدیل نمی‌شود.

            ⚠️ هدف یک شیءِ واقعی است که *به صحنه اضافه شده*، و این اجباری
            است: `target` پیش‌فرضِ نورِ موضعی در گرافِ صحنه نیست، پس
            `matrixWorld`ـش هرگز به‌روز نمی‌شود و نور — هر چه در
            `target.position` بنویسیم — به مبدأ می‌تابد. با `<primitive>`
            هدف عضوِ صحنه می‌شود و جهت واقعاً اعمال می‌شود. */
        <>
        <primitive object={spotTarget} />
        <spotLight
          position={[0, WALL_HEIGHT - 0.5, 1.5]}
          target={spotTarget}
          angle={0.72}
          penumbra={0.92}
          distance={12}
          decay={1.4}
          intensity={26}
          color={palette.keyLight}
          castShadow={false}
        />
        </>
      )}
    </group>
  );
}
