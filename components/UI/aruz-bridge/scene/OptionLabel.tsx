"use client";

import { Html } from "@react-three/drei";
import type { Side } from "@/lib/aruz-bridge/types";

/* ═══════════════════════════════════════════════════════════════════════════
   متنِ گزینه‌ها — اولویتِ دومِ کلِ بازی، بعد از درست‌کارکردنِ gameplay.
   ═══════════════════════════════════════════════════════════════════════════

   متن *روی* سطحِ افقیِ شیشه نوشته نمی‌شود. دو دلیل، هر دو تعیین‌کننده:

     ۱. پرسپکتیو. متنی که روی سطحی افقی و کج‌دیده‌شده بنشیند، در فارسی به‌سرعت
        ناخوانا می‌شود — حروفِ متصل کشیده و له می‌شوند.
     ۲. شکل‌دهی. اگر متن به بافت یا هندسه تبدیل شود (مثلاً troika)، باید فونتی
        داشته باشد که خطِ فارسی را درست بچسباند و راست‌به‌چپ بچیند؛ وگرنه
        حروف جدا، آینه یا وارونه در می‌آیند.

   پس برچسب‌ها DOMـِ واقعی‌اند که در فضای سه‌بعدی جای گرفته‌اند: شکل‌دهیِ متن
   را خودِ مرورگر با فونتِ Vazirmatnـِ سایت انجام می‌دهد (یعنی دقیقاً همان
   چیزی که در بقیهٔ سروا درست کار می‌کند)، ولی `distanceFactor` باعث می‌شود
   با فاصله کوچک شوند و بخشی از دنیای بازی حس شوند.

   `transform` عمداً روشن نیست: با آن، برچسب در فضا کج می‌شد و دوباره همان
   مشکلِ خوانایی برمی‌گشت. این‌طوری همیشه رو به دوربین و خوانا می‌ماند.

   ── چرا برچسب «پایه» دارد ─────────────────────────────────────────────────
   برچسبِ شناور، هرچقدر هم خوانا، بی‌فایده است اگر معلوم نباشد مالِ کدام شیشه
   است. در نمای سه‌چهارم، چیزی که چند ده سانت *بالاتر* از یک کاشی باشد روی
   صفحه دقیقاً همان‌جایی می‌افتد که کاشیِ دو ردیف عقب‌تر دیده می‌شود — و
   بازیکن برچسب را به کاشیِ اشتباه نسبت می‌دهد. یک میلهٔ نازک از سطحِ شیشه تا
   برچسب این ابهام را کاملاً از بین می‌برد:

       [ فاعلاتن ]
             │
         ▔▔▔▔▔▔▔▔  ← کاشی
   ═══════════════════════════════════════════════════════════════════════════ */

const PANEL_BASE =
  "select-none whitespace-nowrap rounded-xl border px-3 py-1.5 text-center font-sans text-xl font-bold backdrop-blur-sm transition-[transform,opacity] duration-200 sm:px-4 sm:py-2 sm:text-2xl";

export function OptionLabel({
  pattern,
  side,
  y,
  opacity,
  dimmed,
  highlight,
  onSelect,
  selectable,
}: {
  pattern: string;
  side: Side;
  y: number;
  opacity: number;
  /** پیش از بازشدنِ پنجرهٔ پاسخ، گزینه‌ها کم‌رنگ‌اند تا چشم روی پرسش بماند. */
  dimmed?: boolean;
  /** بعد از پایان، گزینهٔ درست نشان داده می‌شود. */
  highlight?: "correct" | "wrong" | null;
  onSelect?: () => void;
  selectable?: boolean;
}) {
  const tone =
    highlight === "correct"
      ? "border-primary/90 bg-primary/25 text-white shadow-[0_0_28px_rgba(0,165,166,0.55)]"
      : highlight === "wrong"
        ? "border-destructive/80 bg-destructive/25 text-white"
        : "border-primary/35 bg-[#06131c]/70 text-[#e8f6f7] shadow-[0_2px_18px_rgba(0,0,0,0.55)]";

  return (
    <group>
      {/* پایهٔ برچسب: میلهٔ نازک + نقطهٔ درخشان روی سطحِ شیشه */}
      <mesh position={[0, y / 2, 0]}>
        <boxGeometry args={[0.012, y, 0.012]} />
        <meshBasicMaterial
          color={highlight === "correct" ? "#00d6c2" : "#5fd6da"}
          transparent
          opacity={0.45 * opacity}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial
          color={highlight === "correct" ? "#00d6c2" : "#8fe9ec"}
          transparent
          opacity={0.8 * opacity}
          depthWrite={false}
        />
      </mesh>

      <Html
        position={[0, y, 0]}
        center
        // با فاصله کوچک می‌شود، پس عمق را می‌شکند بی‌آنکه خوانایی را از دست بدهد
        distanceFactor={7}
        zIndexRange={[20, 0]}
        style={{ opacity, pointerEvents: opacity > 0.5 && selectable ? "auto" : "none" }}
      >
        <button
        type="button"
        dir="rtl"
        lang="fa"
        // روی موبایل، خودِ برچسب هم هدفِ لمس است، نه فقط شیشه
        onPointerDown={selectable ? onSelect : undefined}
        disabled={!selectable}
        aria-label={`گزینهٔ ${side === "left" ? "چپ" : "راست"}: ${pattern}`}
        className={`${PANEL_BASE} ${tone} ${dimmed ? "scale-95 opacity-70" : "scale-100"} ${
          selectable ? "cursor-pointer hover:brightness-125 active:scale-95" : "cursor-default"
        }`}
        style={{ letterSpacing: "0.01em" }}
      >
        {pattern}
        </button>
      </Html>
    </group>
  );
}

/** متنِ پرسش — کوتاه ظاهر می‌شود و محو می‌شود. */
export function PromptLabel({
  text,
  y,
  z,
  opacity,
}: {
  text: string;
  y: number;
  z: number;
  opacity: number;
}) {
  if (!text) return null; // حالتِ شنیداریِ آینده: پرسش دیده نمی‌شود، فقط شنیده
  return (
    <Html position={[0, y, z]} center distanceFactor={6} zIndexRange={[30, 10]} style={{ opacity }}>
      <div
        dir="rtl"
        lang="fa"
        className="pointer-events-none select-none whitespace-nowrap rounded-2xl border border-accent/45 bg-[#07141d]/85 px-5 py-2.5 text-center font-sans text-3xl font-black text-[#ffe9bd] shadow-[0_0_40px_rgba(217,164,65,0.28)] backdrop-blur-md sm:px-7 sm:py-3 sm:text-4xl"
      >
        {text}
      </div>
    </Html>
  );
}
