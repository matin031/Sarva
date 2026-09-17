"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { NO_RAYCAST } from "./raycast";

/* ═══════════════════════════════════════════════════════════════════════════
   گیجی — ستاره‌هایی که دورِ سر می‌چرخند.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا همیشه سوار است و فقط پنهان می‌شود.

   وسوسه‌انگیز است که این جلوه فقط هنگامِ نیاز رندر شود (`{failed && <Dizzy/>}`).
   ولی آن یعنی در هر دورِ اشتباه یک هندسه، یک ماده و پنج شیء ساخته و بعد دور
   ریخته می‌شود. صورت‌مسئله دقیقاً همین را منع کرده بود: «دورهای پیاپی نباید
   شیء، ماده و هندسه انباشته کنند».

   پس ستاره‌ها یک بار ساخته می‌شوند و بعد فقط `visible` و یک پیشرفتِ عددی
   عوض می‌شود. هزینهٔ یک گروهِ نامرئی صفر است — three اصلاً از آن رد می‌شود.

   ── دنبال‌کردنِ سر ─────────────────────────────────────────────────────────

   موقعیت از `headRef` خوانده می‌شود که یک شیءِ خالی داخلِ گروهِ شخصیت است.
   یعنی وقتی شخصیت می‌چرخد، می‌دود یا زمین می‌خورد، ستاره‌ها بدونِ هیچ
   ریاضیِ اضافه‌ای با سرش می‌روند — از جمله وقتی سرش روی زمین است.
   ═══════════════════════════════════════════════════════════════════════════ */

const STAR_COUNT = 5;
/** شعاعِ مدار، به متر. */
const ORBIT_X = 0.24;
const ORBIT_Z = 0.13;
const SPIN = 3.1;

/** ستارهٔ پنج‌پر — یک بار ساخته می‌شود و بینِ هر پنج نمونه مشترک است. */
function makeStarGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const outer = 1;
  const inner = 0.44;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    // از بالا شروع می‌شود تا ستاره «سرِپا» باشد و نه کج.
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export interface DizzyStarsProps {
  /** لنگرِ سر — ستاره‌ها موقعیتِ جهانی‌شان را از این می‌گیرند. */
  headRef: React.RefObject<THREE.Object3D | null>;
  /** آیا همین حالا گیج است؟ */
  active: boolean;
  /**
   * چند میلی‌ثانیه پس از فعال‌شدن، ستاره‌ها پیدا شوند.
   *
   * ⚠️ صفر نیست چون کتاب هنوز روی سرِ اوست. ستاره باید وقتی بیاید که
   * کتاب کنار رفته و «آخِ» شخصیت دیده می‌شود — نه در همان لحظهٔ ضربه.
   */
  delayMs?: number;
  color: string;
  reducedMotion: boolean;
}

export function DizzyStars({ headRef, active, delayMs = 0, color, reducedMotion }: DizzyStarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Mesh[]>([]);
  const camera = useThree((state) => state.camera);

  /** ۰ تا ۱ — درِ ورود و خروجِ نرم. در ref است چون هر فریم عوض می‌شود. */
  const amount = useRef(0);
  const phase = useRef(0);
  /** لحظهٔ فعال‌شدن، برای اعمالِ تأخیر. */
  const activatedAt = useRef(0);

  const geometry = useMemo(() => makeStarGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        /* ⚠️ `depthWrite: false` لازم است: پنج صفحهٔ شفاف که روی هم رد
           می‌شوند، با نوشتنِ عمق همدیگر را می‌بُرند و لبه‌های سیاه
           می‌سازند. */
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [color],
  );

  useEffect(() => {
    material.color.set(color);
  }, [material, color]);

  useEffect(() => {
    if (active) activatedAt.current = performance.now();
  }, [active]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const head = headRef.current;
    if (!group) return;

    const delta = Math.min(rawDelta, 0.05);

    /* تا وقتی کتاب روی سرِ اوست، هنوز وقتِ ستاره نیست. */
    const waiting = active && performance.now() - activatedAt.current < delayMs;

    /* ورود سریع، خروج کمی کندتر — ستاره‌ها پس از آزادشدنِ سر بی‌درنگ
       دیده می‌شوند ولی بی‌سروصدا محو می‌شوند. */
    const goal = active && !waiting ? 1 : 0;
    const rate = goal ? 7 : 3.4;
    amount.current += (goal - amount.current) * Math.min(1, rate * delta);

    if (amount.current < 0.004) {
      group.visible = false;
      return;
    }
    group.visible = true;

    if (head) head.getWorldPosition(group.position);
    /* کمی بالاتر از خودِ لنگر، تا ستاره‌ها *دورِ فرقِ سر* بچرخند و نه دورِ
       صورت. */
    group.position.y += 0.16;

    if (!reducedMotion) phase.current += delta * SPIN;

    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      if (!star) continue;
      const angle = phase.current + (i / STAR_COUNT) * Math.PI * 2;

      star.position.set(
        Math.cos(angle) * ORBIT_X * amount.current,
        Math.sin(angle * 2) * 0.035,
        Math.sin(angle) * ORBIT_Z * amount.current,
      );

      /* ستاره‌ها رو به دوربین می‌مانند، وگرنه در نیمهٔ مدار از لبه دیده
         می‌شدند و ناپدید می‌شدند. */
      star.quaternion.copy(camera.quaternion);
      /* چرخشِ کوچکِ خودِ ستاره دورِ محورِ دید — همان «چرخ‌خوردن» کارتونی. */
      star.rotateZ(angle * 0.6);

      /* ستاره‌های پشتِ سر کوچک‌تر و کم‌رنگ‌ترند: همان عمقی که یک مدارِ
         واقعی می‌دهد، بدونِ آنکه به مرتب‌سازیِ شفافیت نیاز باشد. */
      const depth = (Math.sin(angle) + 1) / 2;
      const scale = (0.045 + depth * 0.032) * amount.current;
      star.scale.setScalar(scale);
    }

    material.opacity = amount.current * 0.95;
  });

  return (
    <group ref={groupRef} visible={false} raycast={NO_RAYCAST}>
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            if (node) starsRef.current[i] = node;
          }}
          geometry={geometry}
          material={material}
          raycast={NO_RAYCAST}
        />
      ))}
    </group>
  );
}
