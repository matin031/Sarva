"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { LANE_OFFSET, TILE_DEPTH, TILE_WIDTH } from "@/lib/aruz-bridge/layout";
import type { Side } from "@/lib/aruz-bridge/types";

/* ═══════════════════════════════════════════════════════════════════════════
   تنها چیزی در کلِ صحنه که حق دارد پاسخ را ثبت کند.
   ═══════════════════════════════════════════════════════════════════════════

   ── چرا این وجود دارد ─────────────────────────────────────────────────────
   پیش‌تر خودِ تختهٔ شیشه رویدادِ اشاره‌گر می‌گرفت و لبه‌ها، متن و حلقه
   فرزندانش بودند. سه ایراد از همین یک تصمیم می‌آمد و هر سه با هم دیده
   می‌شدند:

   ۱. `EdgesGeometry` یک `LineSegments` است و three خط‌ها را با آستانهٔ
      `raycaster.params.Line.threshold` تقاطع می‌دهد — که پیش‌فرضش **یک واحدِ
      جهانی** است، یعنی یک متر. شکافِ بینِ دو کاشی فقط ۶۰ سانت است، پس
      لبه‌های *هر دو* کاشی از هر جای این ناحیه «خورده» می‌شدند.

   ۲. چون تقاطعِ خط فاصله را روی نزدیک‌ترین نقطهٔ پرتو گزارش می‌کند، لبهٔ کاشیِ
      چپ تقریباً همیشه نزدیک‌تر از سطحِ واقعیِ کاشیِ راست در می‌آمد. پس کلیک
      روی شیشهٔ راست، کاشیِ چپ را برنده می‌کرد — همان «راست زدم، چپ پرید».

   ۳. رویدادها از فرزند به والد بالا می‌رفتند، پس خوردنِ لبه یا متن هم
      `onPointerOver`ـِ تخته را روشن می‌کرد و هر دو کاشی هم‌زمان hover
      می‌شدند.

   ── راهکار ────────────────────────────────────────────────────────────────
   یک جعبهٔ نامرئیِ اختصاصی به‌ازای هر گزینه، که *تنها* شنوندهٔ رویداد در
   صحنه است. هر چیزِ تزئینی — لبه، متن، ترک، قطعات، سازه، ذرات — صراحتاً از
   پرتوافکنی خارج شده (`raycast={NO_RAYCAST}`), پس نه فاصلهٔ دروغین می‌سازد و
   نه رویدادِ ناخواسته.

   جعبه‌ها برای لمسِ راحت کمی از خودِ شیشه بزرگ‌ترند، ولی *هرگز* هم‌پوشانی
   ندارند: پهنایشان طوری بسته شده که همیشه یک شکافِ خنثای واقعی بینشان بماند
   (پایینِ همین فایل با یک ادعای زمانِ-بارگذاری تضمین شده). پس «وسط» همیشه
   یعنی هیچ‌کدام، نه هر دو.
   ═══════════════════════════════════════════════════════════════════════════ */

/** پرتو از این شیء رد می‌شود. three این را روی هر Object3D می‌پذیرد. */
export const NO_RAYCAST = () => null;

/** بزرگ‌نماییِ افقیِ ناحیهٔ لمس نسبت به خودِ شیشه. */
const TOUCH_PAD_X = 1.12;
/** در راستای عمق دست‌ودل‌بازتریم؛ اینجا چیزی برای برخورد وجود ندارد. */
const TOUCH_PAD_Z = 1.35;
/** ارتفاعِ جعبه: از کمی زیرِ شیشه تا بالای سرِ بازیکن. */
const HIT_HEIGHT = 1.6;

const HIT_WIDTH = TILE_WIDTH * TOUCH_PAD_X;
const HIT_DEPTH = TILE_DEPTH * TOUCH_PAD_Z;

/** فاصلهٔ لبه‌های داخلیِ دو جعبه. اگر صفر یا منفی شود، انتخاب مبهم می‌شود. */
export const HIT_TARGET_GAP = 2 * LANE_OFFSET - HIT_WIDTH;

/* گاردِ زمانِ بارگذاری. اگر روزی کسی عرضِ کاشی، فاصلهٔ خطوط یا حاشیهٔ لمس را
   عوض کند و شکاف از بین برود، همین‌جا می‌شکند — نه در دستِ بازیکن. */
if (HIT_TARGET_GAP < 0.2) {
  throw new Error(
    `[پلِ وزن] ناحیه‌های لمسِ چپ و راست باید شکافِ خنثی داشته باشند؛ الان ${HIT_TARGET_GAP.toFixed(2)} متر است.`,
  );
}

export interface AnswerHitTargetProps {
  side: Side;
  /** شناسهٔ یکتای همین کاشی در همین مرحله — مبنای hover و انتخاب. */
  tileId: string;
  /** فقط وقتی ماشینِ حالت واقعاً پاسخ می‌پذیرد. */
  enabled: boolean;
  /** `entering=false` یعنی اشاره‌گر از همین کاشی بیرون رفت. */
  onHover: (tileId: string, entering: boolean) => void;
  onSelect: (side: Side) => void;
  /** حالتِ اشکال‌زدایی: جعبه‌ها را دیدنی می‌کند. */
  debug?: boolean;
}

export function AnswerHitTarget({
  side,
  tileId,
  enabled,
  onHover,
  onSelect,
  debug = false,
}: AnswerHitTargetProps) {
  /* هر دستگیره اول از همه جلوی انتشار را می‌گیرد: هیچ شیئی پشتِ این جعبه
     نباید همان رویداد را دوباره ببیند. */
  const stop = (e: ThreeEvent<PointerEvent>) => e.stopPropagation();

  return (
    <mesh
      position={[0, HIT_HEIGHT / 2 - 0.2, 0]}
      onPointerOver={
        enabled
          ? (e) => {
              stop(e);
              onHover(tileId, true);
            }
          : undefined
      }
      onPointerOut={
        enabled
          ? (e) => {
              stop(e);
              onHover(tileId, false);
            }
          : undefined
      }
      onPointerDown={
        enabled
          ? (e) => {
              stop(e);
              onSelect(side);
            }
          : undefined
      }
    >
      <boxGeometry args={[HIT_WIDTH, HIT_HEIGHT, HIT_DEPTH]} />
      {/* نامرئی ولی قابلِ برخورد. `visible={false}` به‌کار نمی‌رود چون
          R3F اشیای نامرئی را از پرتوافکنی کنار می‌گذارد. */}
      <meshBasicMaterial
        color={side === "left" ? "#ff5f5f" : "#5fa8ff"}
        transparent
        opacity={debug ? 0.22 : 0}
        depthWrite={false}
        depthTest={!debug}
        wireframe={debug}
      />
    </mesh>
  );
}
