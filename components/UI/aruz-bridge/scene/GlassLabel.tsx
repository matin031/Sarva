"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TILE_THICKNESS, TILE_WIDTH } from "@/lib/aruz-bridge/layout";
import { NO_RAYCAST } from "./AnswerHitTarget";
import { createTextTexture } from "./textTexture";

/* ═══════════════════════════════════════════════════════════════════════════
   وزنِ نوشته‌شده روی خودِ شیشه.
   ═══════════════════════════════════════════════════════════════════════════

   این کامپوننت جایگزینِ برچسب‌های شناورِ HTML شد. آن‌ها در فضای *صفحه*
   زندگی می‌کردند نه در دنیای بازی، و دو مشکلِ جدی داشتند: شبیه یک کارتِ
   رابطِ کاربری بودند نه بخشی از پل، و چون فقط نقطهٔ مرکزشان به کاشی گره
   خورده بود، با عوض‌شدنِ نسبتِ صفحه (مخصوصاً موبایلِ عمودی) جابه‌جا می‌شدند
   و به کاشیِ اشتباه اشاره می‌کردند.

   حالا متن یک صفحهٔ نازک است که *فرزندِ خودِ کاشی* است. یعنی هم‌ترازی دیگر
   محاسبه نمی‌شود؛ از ساختارِ صحنه می‌آید. هر تبدیلی که روی کاشی برود — حرکت،
   لرزشِ پیش از شکستن، پرسپکتیوِ دوربین — عیناً روی متن هم می‌رود. روی هیچ
   نسبتِ تصویری هم لغزش ممکن نیست، چون چیزی برای لغزیدن وجود ندارد.

   ── جبرانِ کوتاه‌شدگی ─────────────────────────────────────────────────────
   متنی که صاف روی سطحِ افقی بخوابد، از زاویهٔ دوربین در راستای عمق فشرده
   می‌شود. برای همین صفحهٔ متن در راستای z کشیده می‌شود (`DEPTH_STRETCH`) تا
   بعد از تصویرشدن دوباره متناسب دیده شود — همان کاری که در نشانه‌های روی
   آسفالتِ خیابان می‌کنند.
   ═══════════════════════════════════════════════════════════════════════════ */

/* کششِ عمقی برای خنثی‌کردنِ فشردگیِ پرسپکتیو.
   با چیدمانِ فعلیِ دوربین، سطحِ کاشی حدودِ ۶۰ درجه از راستای عمود دیده
   می‌شود، یعنی عمق تقریباً نصف می‌شود. جبرانِ *کامل* (~۲٫۰) متن را از سطح
   جدا و شناور نشان می‌دهد؛ مثلِ نشانه‌های روی آسفالت، جبرانِ نسبی نتیجهٔ
   طبیعی‌تری می‌دهد. */
const DEPTH_STRETCH = 1.9;
const LABEL_WIDTH = TILE_WIDTH * 0.9;
const LABEL_ASPECT = 2.6;

export interface GlassLabelProps {
  text: string;
  /** ۰..۱ — بازی از روی حالتِ فعلی می‌دهد؛ گذارش نرم است. */
  opacity: number;
  highlight?: "correct" | "wrong" | null;
}

export function GlassLabel({ text, opacity, highlight = null }: GlassLabelProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const shown = useRef(0);

  const texture = useMemo(
    () =>
      createTextTexture({
        text,
        color:
          highlight === "correct"
            ? "#7CFFE4"
            : highlight === "wrong"
              ? "#FFB4B4"
              : "#f2fdff",
        aspect: LABEL_ASPECT,
      }),
    [text, highlight],
  );

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  // محوشدن نرم است ولی از رندر نمی‌گذرد: شفافیت هر فریم روی ماده نوشته می‌شود.
  useFrame((_, delta) => {
    shown.current += (opacity - shown.current) * Math.min(1, delta * 9);
    const mat = materialRef.current;
    if (mat) mat.opacity = shown.current;
  });

  if (!texture) return null;

  const height = (LABEL_WIDTH / LABEL_ASPECT) * DEPTH_STRETCH;

  return (
    <mesh
      /* درست بالای سطحِ شیشه. فاصلهٔ ۳ میلی‌متری فقط برای جلوگیری از
         جنگِ عمق (z-fighting) است؛ از دور دیده نمی‌شود. */
      position={[0, TILE_THICKNESS / 2 + 0.003, 0]}
      /* صفحه به‌طور پیش‌فرض در صفحهٔ XY و رو به +Z است. این چرخش می‌خواباندش
         رو به بالا، طوری که بالای متن به سمتِ دورِ صحنه باشد — مثلِ نوشته‌ای
         روی زمین که از پشتِ سر می‌خوانیمش. */
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={4}
      // تزئینی است؛ نباید در انتخابِ پاسخ دخالت کند
      raycast={NO_RAYCAST}
    >
      <planeGeometry args={[LABEL_WIDTH, height]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        // بدونِ این، متن پشتِ شیشهٔ شفاف قرار می‌گیرد و ناپدید می‌شود.
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}


