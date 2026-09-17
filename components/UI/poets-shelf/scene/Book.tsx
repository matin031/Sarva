"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BOOK_HEIGHT, BOOK_SCALE, type BookSlot } from "@/lib/poets-shelf/layout";
import type { ScenePalette } from "@/lib/poets-shelf/theme";
import type { BookAsset } from "./bookAsset";
import { bookPose, makeBookPose, type BookCueKind } from "./bookChoreography";
import { NO_RAYCAST } from "./raycast";

/* ═══════════════════════════════════════════════════════════════════════════
   یک کتاب: مشِ صُلب + ناحیهٔ لمس + برچسبِ دسترس‌پذیر.
   ═══════════════════════════════════════════════════════════════════════════

   سه چیزِ جدا که عمداً با هم در یک کامپوننت‌اند، چون هر سه از یک `slot`
   مشتق می‌شوند و هیچ‌وقت نباید از هم جدا بیفتند:

     • مشِ متحرک — چیزی که بازیکن می‌بیند و تکان می‌خورد.
     • جعبهٔ لمسِ *ثابت* — چیزی که کلیک می‌گیرد.
     • برچسبِ HTML — عنوانِ فارسی، که هم‌زمان دکمهٔ صفحه‌کلید هم هست.

   ⚠️ جعبهٔ لمس با کتاب حرکت *نمی‌کند* و این عمدی است: اگر فرزندِ مشِ متحرک
   بود، هنگامِ شناوری و کج‌شدنِ hover زیرِ انگشتِ کاربر جابه‌جا می‌شد و
   نشانگر بی‌دلیل روشن و خاموش می‌شد — همان لرزشی که در منوهای سه‌بعدی
   دیده می‌شود. ناحیهٔ هدف باید ثابت باشد حتی وقتی هدف تکان می‌خورد.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BookProps {
  slot: BookSlot;
  title: string;
  /** نشانهٔ فعلی. `hover` از خودِ کامپوننت می‌آید و اینجا نمی‌آید. */
  cue: BookCueKind;
  /** آیا همین حالا انتخاب ممکن است؟ */
  enabled: boolean;
  onSelect: (index: number) => void;
  palette: ScenePalette;
  asset: BookAsset;
  reducedMotion: boolean;
  shadows: boolean;
  /** جعبه‌های لمس را دیدنی می‌کند (‎?debugHits=1‎). */
  debugHits?: boolean;
}

function BookImpl({
  slot,
  title,
  cue,
  enabled,
  onSelect,
  palette,
  asset,
  reducedMotion,
  shadows,
  debugHits = false,
}: BookProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverStartedAt = useRef(0);
  /* ⚠️ با صفر مقداردهی می‌شود و نه با `performance.now()`: خواندنِ ساعت در
     بدنهٔ رندر، رندر را ناخالص می‌کند. effectِ زیر هنگامِ سوارشدن هم اجرا
     می‌شود، پس مقدارِ واقعی پیش از اولین فریم نشسته است. */
  const cueStartedAt = useRef(0);

  /* ⚠️ ساعتِ نشانه *اینجا* نگه داشته می‌شود و از بیرون نمی‌آید، و این یک
     اشکالِ واقعی را می‌بندد.

     ماشینِ حالت هنگامِ برخورد از `resolving` به `failure` می‌رود — یعنی
     وسطِ همان کوبشی که در جریان است. اگر ساعت به گذارِ حالت بسته بود،
     دقیقاً در لحظهٔ برخورد صفر می‌شد و کتاب از اول می‌افتاد.

     نشانهٔ کتاب در هر دو حالت `slam` است، پس با بستنِ ساعت به *خودِ نشانه*،
     آن گذار هیچ اثری ندارد. */
  useEffect(() => {
    cueStartedAt.current = performance.now();
  }, [cue]);

  /* ⚠️ ژست یک بار ساخته می‌شود و هر فریم *بازنویسی* می‌شود. برگرداندنِ یک
     شیءِ تازه در هر فریم یعنی ۶۰ تخصیص در ثانیه برای هر کتاب — یعنی ۳۰۰
     شیءِ دورریختنی در ثانیه که زباله‌روب باید جمعشان کند. */
  const pose = useMemo(() => makeBookPose(), []);

  /** هر کتاب مادهٔ خودش را دارد چون درخشش‌شان جداگانه است. بافت مشترک است. */
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: asset.texture,
        roughness: 0.78,
        metalness: 0.02,
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 1,
      }),
    [asset.texture],
  );

  /* ⚠️ فقط *ماده* آزاد می‌شود و نه بافت و هندسه. آن دو در `bookAsset.ts`
     مشترک‌اند و بینِ هر پنج کتاب به اشتراک گذاشته شده‌اند؛ آزادکردنشان از
     اینجا بقیهٔ کتاب‌ها را خالی می‌کرد. */
  useEffect(() => () => material.dispose(), [material]);

  /** رنگِ درخشش با نتیجه عوض می‌شود — و هر سه از توکن‌های سروا می‌آیند. */
  const glowColor = useMemo(() => {
    const hex = cue === "cheer" ? palette.correct : cue === "slam" ? palette.wrong : palette.hover;
    return new THREE.Color(hex);
  }, [cue, palette.correct, palette.wrong, palette.hover]);

  useEffect(() => {
    if (hovered) hoverStartedAt.current = performance.now();
  }, [hovered]);

  /* ⚠️ «زیرِ اشاره‌گر بودن» و «قابلِ انتخاب بودن» دو چیزند و اینجا *مشتق*
     می‌شوند و نه همگام‌سازی.

     نسخهٔ اول یک effect داشت که با قفل‌شدنِ ورودی `setHovered(false)`
     می‌کرد. کار می‌کرد ولی یک رندرِ آبشاری بود و بدتر: اگر اشاره‌گر همان‌جا
     می‌ماند و ورودی دوباره باز می‌شد، کتاب تا اولین تکانِ ماوس روشن
     نمی‌شد — چون `hovered` به‌زور صفر شده بود و هیچ رویدادِ تازه‌ای
     نمی‌آمد. یک مقدارِ مشتق هر دو مسئله را ندارد. */
  const showHover = hovered && enabled;

  /* نشانگرِ ماوس فقط وقتی دست می‌شود که واقعاً چیزی قابلِ انتخاب باشد. */
  useEffect(() => {
    if (!showHover) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [showHover]);


  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const now = state.clock.elapsedTime;
    /* `hover` فقط وقتی معنی دارد که هیچ نشانهٔ مهم‌تری در جریان نباشد. */
    const effective: BookCueKind = cue === "rest" && showHover ? "hover" : cue;
    const startedAt = effective === "hover" ? hoverStartedAt.current : cueStartedAt.current;
    const elapsed = performance.now() - startedAt;

    bookPose(pose, effective, elapsed, now, slot.position[0], reducedMotion);

    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
    mesh.scale.set(BOOK_SCALE * pose.scaleX, BOOK_SCALE * pose.scaleY, BOOK_SCALE * pose.scaleZ);

    /* درخشش با `lerp` به سمتِ رنگِ هدف می‌رود و نه پرشی — تغییرِ ناگهانیِ
       خودتابی روی یک جلدِ تیره مثلِ چشمک‌زدن دیده می‌شد. */
    material.emissive.lerp(glowColor, 0.25);
    material.emissiveIntensity += (pose.glow * 0.55 - material.emissiveIntensity) * 0.2;
  });

  const stop = (event: ThreeEvent<PointerEvent>) => event.stopPropagation();

  return (
    <group>
      {/* ── مشِ کتاب ────────────────────────────────────────────────────────
          از پرتوافکنی بیرون است: تنها جعبهٔ زیر حق دارد کلیک بگیرد. */}
      <mesh
        ref={meshRef}
        geometry={asset.geometry}
        material={material}
        castShadow={shadows}
        receiveShadow={false}
        raycast={NO_RAYCAST}
      />

      {/* ── ناحیهٔ لمس ──────────────────────────────────────────────────────
          بزرگ‌تر از خودِ کتاب (عطفِ کتاب فقط ۹ سانت است و روی گوشی عملاً
          غیرقابلِ زدن)، ولی پهنایش در `layout.ts` به `spacing` سقف خورده تا
          دو ناحیهٔ همسایه هرگز روی هم نیفتند. */}
      <mesh
        position={[slot.position[0], slot.position[1] + BOOK_HEIGHT * 0.45, slot.position[2] + 0.04]}
        onPointerOver={
          enabled
            ? (event) => {
                stop(event);
                setHovered(true);
              }
            : undefined
        }
        onPointerOut={
          enabled
            ? (event) => {
                stop(event);
                setHovered(false);
              }
            : undefined
        }
        /* ⚠️ `onPointerDown` و نه `onClick`: روی صفحه‌های لمسی، `click` پس از
           تأخیرِ تشخیصِ دابل‌تپ می‌آید و انتخاب کُند حس می‌شد. */
        onPointerDown={
          enabled
            ? (event) => {
                stop(event);
                onSelect(slot.index);
              }
            : undefined
        }
      >
        <boxGeometry args={[...slot.hitSize] as [number, number, number]} />
        {/* نامرئی ولی قابلِ برخورد. `visible={false}` به‌کار نمی‌رود چون R3F
            اشیای نامرئی را از پرتوافکنی کنار می‌گذارد. */}
        <meshBasicMaterial
          color="#4fd1c5"
          transparent
          opacity={debugHits ? 0.22 : 0}
          depthWrite={false}
          depthTest={!debugHits}
          wireframe={debugHits}
        />
      </mesh>

      {/* ── برچسب ──────────────────────────────────────────────────────────

          ⚠️ چرا DOM و نه متنِ سه‌بعدی.

          خطِ فارسی باید شکل بگیرد: حروف به هم می‌چسبند و شکلِ آغازین،
          میانی و پایانی می‌گیرند. راهکارهای متنِ سه‌بعدی (troika و مانندش)
          این را یا نمی‌کنند یا با قلمِ جداگانه و شکننده می‌کنند. یک عنصرِ
          DOM همان موتورِ متنی را می‌گیرد که کلِ سروا با آن درست رندر
          می‌شود — و راست‌به‌چپ، انتخابِ متن و بزرگ‌نماییِ مرورگر هم مجانی
          به‌دست می‌آید.

          سودِ دومش دسترس‌پذیری است: این برچسب یک `<button>` واقعی است، پس
          با Tab و Enter هم کار می‌کند. بوم برای فناوریِ کمکی پنهان است و
          همهٔ گزینه‌ها از همین‌جا خوانده می‌شوند. */}
      <Html
        position={[...slot.label] as [number, number, number]}
        center
        /* اشاره‌گر فقط روی خودِ دکمه فعال است، وگرنه یک مستطیلِ نامرئی جلوی
           کلیک روی کتاب‌ها را می‌گرفت. */
        pointerEvents="none"
        zIndexRange={[20, 10]}
        wrapperClass="ps-label-wrapper"
      >
        <button
          type="button"
          className="ps-label"
          data-state={cue}
          disabled={!enabled}
          onClick={() => onSelect(slot.index)}
          onPointerEnter={() => enabled && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => enabled && setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          {title}
        </button>
      </Html>
    </group>
  );
}

/* ⚠️ `memo` اینجا واقعاً کار می‌کند و تزئینی نیست: والد در هر تغییرِ حالتِ
   بازی رندر می‌شود، ولی چهار کتاب از پنج‌تا هیچ prop‌ِ عوض‌شده‌ای ندارند.
   بدونِ آن، هر گذارِ حالت پنج کتاب را دوباره رندر می‌کرد و `useMemo`های
   مادهٔ داخلشان هم بی‌دلیل بررسی می‌شدند. */
export const Book = memo(BookImpl);
