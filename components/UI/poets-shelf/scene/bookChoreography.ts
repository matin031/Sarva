import { ARRIVAL_Z, BOOK_HEIGHT, BOOK_Z, CHARACTER_HEIGHT, SHELF_Y } from "@/lib/poets-shelf/layout";

/* ═══════════════════════════════════════════════════════════════════════════
   رقصِ کتاب — تابعِ خالص از «چه حالتی، چند میلی‌ثانیه گذشته» به یک ژست.
   ═══════════════════════════════════════════════════════════════════════════

   ── ⚠️ محدودیتِ دارایی، و اینکه چرا کتاب باز نمی‌شود ────────────────────────

   مدلِ داده‌شده (`OldBook001.fbx`) بازرسی شد:

     • یک مشِ واحد با ۱۵۶ رأس و ۵۲ مثلث.
     • یک ماده، بدونِ گروه‌بندی.
     • هیچ استخوانی، هیچ محورِ چرخشی، هیچ کلیپِ انیمیشنی.
     • جلد و صفحه‌ها *جدا نیستند*: یک پوستهٔ بسته است و درونش اصلاً مدل
       نشده.

   یعنی «بازکردنِ جلد» ممکن نیست. چرخاندنِ نیمی از مثلث‌ها دورِ عطف، یک
   پوستهٔ توخالی را از داخل نشان می‌داد — چیزی که بدتر از نبودنِ انیمیشن
   است. صورت‌مسئله هم دقیقاً همین را منع کرده بود: «اگر ساختارِ دارایی
   بازشدنِ قانع‌کننده را ناممکن می‌کند، مدل را خراب نکن».

   ── پس به‌جایش چه ───────────────────────────────────────────────────────

   کتاب مثلِ یک *جسمِ صُلب* بازی می‌کند و همهٔ نمایش از حرکتِ کلِ آن می‌آید.
   این تصمیم به سودِ صحنه هم تمام شد: کتابی که از طاقچه کنده می‌شود و روی
   سر می‌کوبد، از کتابی که سرِ جایش بسته می‌شود خیلی کارتونی‌تر است — و
   خواستهٔ صورت‌مسئله هم همین بود که «منبعِ ضربه، خودِ کتاب باشد».

   ── جایگزین‌پذیری ─────────────────────────────────────────────────────────

   این ماژول فقط *عدد* برمی‌گرداند و هیچ‌چیزی دربارهٔ هندسه نمی‌داند. اگر
   روزی کتابی با جلدِ جدا یا استخوان رسید، `Book.tsx` می‌تواند علاوه بر این
   ژست، زاویهٔ جلد را هم بدهد؛ نه این فایل عوض می‌شود و نه بقیهٔ بازی.
   ═══════════════════════════════════════════════════════════════════════════ */

export type BookCueKind =
  /** روی طاقچه، بی‌اتفاق. */
  | "rest"
  /** اشاره‌گر رویش است. */
  | "hover"
  /** انتخاب شده و شخصیت در راه است. */
  | "chosen"
  /** پاسخِ درست بود. */
  | "cheer"
  /** پاسخِ نادرست بود — کنده می‌شود و می‌کوبد. */
  | "slam";

/** ژستِ خروجی. شیءِ *قابلِ بازنویسی* است تا در `useFrame` چیزی تخصیص نشود. */
export interface BookPose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  /** ۰ تا ۱ — شدتِ درخششِ خودتاب. */
  glow: number;
}

export function makeBookPose(): BookPose {
  return { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1, glow: 0 };
}

/* ── زمان‌بندیِ کوبش ───────────────────────────────────────────────────────
   همه بر حسبِ میلی‌ثانیه از شروعِ نشانه. `SLAM_FALL` باید با
   `config.slamMs` یکی باشد — ماشینِ حالت در همان لحظه `impact` می‌فرستد. */
export const SLAM_FALL = 380;
const SLAM_SQUASH = 95;
const SLAM_HOLD = 240;
const SLAM_RETURN = 620;

/* ── زمان‌بندیِ جشن ───────────────────────────────────────────────────────── */
const CHEER_RISE = 260;
const CHEER_HOLD = 1050;
const CHEER_RETURN = 420;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * جایی که کتاب هنگامِ کوبیدن می‌رسد.
 *
 * ⚠️ z روی ‎ARRIVAL_Z − BOOK_HEIGHT/2‎ است و نه روی خودِ ARRIVAL_Z. وقتی کتاب
 * ۹۰ درجه خوابیده، بدنه‌اش از مبدأ به سمتِ دوربین کشیده می‌شود؛ با این
 * جابه‌جایی *مرکزِ* کتابِ خوابیده دقیقاً روی سرِ شخصیت می‌افتد و نه لبه‌اش.
 */
const SLAM_Y = CHARACTER_HEIGHT * 0.945;
const SLAM_Z = ARRIVAL_Z - BOOK_HEIGHT / 2;
/** کمی بیش از قائمه، تا ضربه «کوبنده» بخواند و نه «گذاشته‌شده». */
const SLAM_TILT = (Math.PI / 2) * 1.07;

/**
 * ژستِ کتاب را حساب می‌کند.
 *
 * `elapsed` میلی‌ثانیه از شروعِ نشانه است و `clock` ثانیه‌های صحنه (برای
 * حرکت‌های حلقه‌ایِ بی‌آغاز مثلِ شناوری).
 *
 * ⚠️ همهٔ مقدارها *مطلق*‌اند و نه افزایشی: هر شاخه هر نه مقدار را می‌نویسد.
 * درسِ `components/UI/aruz-bridge/scene/Player.tsx` همین بود — ژستی که فقط
 * چیزهای لازمِ خودش را بنویسد، بقیه را از ژستِ قبلی نشت می‌دهد و آن نشت
 * فقط وقتی دیده می‌شود که ترتیبِ حالت‌ها عوض شود.
 */
export function bookPose(
  out: BookPose,
  kind: BookCueKind,
  elapsed: number,
  clock: number,
  restX: number,
  reducedMotion: boolean,
): BookPose {
  out.x = restX;
  out.y = SHELF_Y;
  out.z = BOOK_Z;
  out.rotX = 0;
  out.rotY = 0;
  out.rotZ = 0;
  out.scaleX = 1;
  out.scaleY = 1;
  out.scaleZ = 1;
  out.glow = 0;

  switch (kind) {
    case "hover": {
      /* بیرون‌آمدنِ کوتاه از قفسه و یک کج‌شدنِ بسیار کم. بازخوردِ لمس باید
         *دیده* شود ولی نباید چیدمان را به‌هم بریزد، پس جابه‌جایی چند
         سانت است و نه بیشتر. */
      const t = easeOut(clamp01(elapsed / 170));
      out.z = BOOK_Z + 0.075 * t;
      out.y = SHELF_Y + 0.022 * t;
      out.rotX = -0.1 * t;
      out.glow = 0.28 * t;
      break;
    }

    case "chosen": {
      /* انتخاب‌شده و منتظر. یک نبضِ آرام که می‌گوید «همین است»، بدونِ آنکه
         توجه را از دویدنِ شخصیت بدزدد. */
      const t = easeOut(clamp01(elapsed / 200));
      const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 5.2);
      out.z = BOOK_Z + 0.1 * t;
      out.y = SHELF_Y + 0.03 * t;
      out.rotX = -0.13 * t;
      out.glow = t * (0.34 + pulse * 0.2);
      break;
    }

    case "cheer": {
      /* بالا می‌آید، کمی به عقب می‌خوابد تا رویش به دوربین باشد، و آرام
         می‌چرخد. جشن باید *آرام* باشد: این بازی قرار نیست سر و صدا کند. */
      if (elapsed < CHEER_RISE) {
        const t = easeOut(elapsed / CHEER_RISE);
        out.y = SHELF_Y + 0.26 * t;
        out.z = BOOK_Z + 0.16 * t;
        out.rotX = -0.3 * t;
        out.glow = t;
      } else if (elapsed < CHEER_RISE + CHEER_HOLD) {
        const t = (elapsed - CHEER_RISE) / CHEER_HOLD;
        const bob = reducedMotion ? 0 : Math.sin(t * Math.PI * 2.4) * 0.035;
        out.y = SHELF_Y + 0.26 + bob;
        out.z = BOOK_Z + 0.16;
        out.rotX = -0.3;
        out.rotY = reducedMotion ? 0 : Math.sin(t * Math.PI * 1.6) * 0.22;
        out.glow = 1;
      } else {
        const t = easeInOut(clamp01((elapsed - CHEER_RISE - CHEER_HOLD) / CHEER_RETURN));
        out.y = SHELF_Y + 0.26 * (1 - t);
        out.z = BOOK_Z + 0.16 * (1 - t);
        out.rotX = -0.3 * (1 - t);
        out.glow = 1 - t;
      }
      break;
    }

    case "slam": {
      if (elapsed < SLAM_FALL) {
        /* پردهٔ ۱ — کنده‌شدن و فرود.

           ⚠️ شتاب‌گیرنده (`easeIn`) و نه یکنواخت: چیزی که می‌افتد باید
           شتاب بگیرد. با حرکتِ یکنواخت، کتاب شبیهِ چیزی می‌شد که کسی
           آرام پایینش می‌آورد — و کلِ لحظهٔ ضربه از بین می‌رفت.

           قوسِ ارتفاع جدا از خطِ افقی حساب می‌شود تا کتاب اول کمی بالا
           بپرد (انگار از لبه می‌جهد) و بعد فرود بیاید. */
        const t = elapsed / SLAM_FALL;
        const fall = easeIn(t);
        const hop = Math.sin(t * Math.PI) * 0.1;

        out.x = restX;
        out.y = SHELF_Y + (SLAM_Y - SHELF_Y) * fall + hop;
        out.z = BOOK_Z + (SLAM_Z - BOOK_Z) * easeOut(t);
        out.rotX = SLAM_TILT * fall;
        out.rotZ = Math.sin(t * Math.PI * 1.2) * 0.14;
        out.glow = 0.25 * (1 - t);
      } else if (elapsed < SLAM_FALL + SLAM_SQUASH) {
        /* پردهٔ ۲ — برخورد. له‌شدنِ کوتاه در راستای ضخامت، با پهن‌شدنِ
           جبرانی در دو راستای دیگر. حجم تقریباً حفظ می‌شود، که همان
           چیزی است که چشم از یک ضربهٔ کارتونی انتظار دارد. */
        const t = (elapsed - SLAM_FALL) / SLAM_SQUASH;
        const squash = Math.sin(t * Math.PI);
        out.x = restX;
        out.y = SLAM_Y - 0.03 * squash;
        out.z = SLAM_Z;
        out.rotX = SLAM_TILT;
        out.scaleY = 1 - 0.3 * squash;
        out.scaleX = 1 + 0.16 * squash;
        out.scaleZ = 1 + 0.16 * squash;
        out.glow = 0.5 * squash;
      } else if (elapsed < SLAM_FALL + SLAM_SQUASH + SLAM_HOLD) {
        /* پردهٔ ۳ — یک لحظه روی سر می‌ماند. همین مکثِ کوتاه است که ضربه
           را *کمدی* می‌کند و نه خشن. */
        out.x = restX;
        out.y = SLAM_Y;
        out.z = SLAM_Z;
        out.rotX = SLAM_TILT;
        break;
      } else {
        /* پردهٔ ۴ — کتاب کنار می‌رود و شخصیت را آزاد می‌کند، و سرِ جایش
           برمی‌گردد. این همان «کتاب رها می‌کند» است: تا وقتی کتاب روی سرِ
           اوست، هیچ ژستِ دیگری خوانده نمی‌شود. */
        const t = easeInOut(clamp01((elapsed - SLAM_FALL - SLAM_SQUASH - SLAM_HOLD) / SLAM_RETURN));
        out.x = restX;
        out.y = SLAM_Y + (SHELF_Y - SLAM_Y) * t;
        out.z = SLAM_Z + (BOOK_Z - SLAM_Z) * t;
        out.rotX = SLAM_TILT * (1 - t);
      }
      break;
    }

    default: {
      /* روی طاقچه. یک شناوریِ بسیار کم که کتاب‌ها را «زنده» نگه می‌دارد.
         فازش با x جابه‌جا می‌شود تا پنج کتاب هماهنگ بالا و پایین نروند —
         هماهنگی، صحنه را مکانیکی نشان می‌دهد. */
      if (!reducedMotion) {
        out.y = SHELF_Y + Math.sin(clock * 1.15 + restX * 2.3) * 0.006;
      }
      break;
    }
  }

  return out;
}

/** کلِ مدتِ یک نشانه — برای زمان‌بندیِ نشانه‌های وابسته (مثلِ ستاره‌های گیجی). */
export const SLAM_TOTAL = SLAM_FALL + SLAM_SQUASH + SLAM_HOLD + SLAM_RETURN;
/** لحظهٔ برخورد از شروعِ نشانهٔ کوبش. */
export const SLAM_IMPACT_AT = SLAM_FALL;
/**
 * چقدر پس از *برخورد*، کتاب از روی سر بلند می‌شود.
 *
 * ⚠️ ستاره‌های گیجی با همین عدد تأخیر می‌گیرند. ترتیبِ درستِ روایت این
 * است: کتاب می‌کوبد → یک لحظه روی سر می‌ماند → کنار می‌رود و او را آزاد
 * می‌کند → *آن‌وقت* ستاره‌ها پیدا می‌شوند. اگر ستاره‌ها هم‌زمان با ضربه
 * بیایند، دو اتفاق در یک لحظه جمع می‌شوند و هیچ‌کدام خوانده نمی‌شوند.
 */
export const SLAM_RELEASE_AFTER_IMPACT = SLAM_SQUASH + SLAM_HOLD;
