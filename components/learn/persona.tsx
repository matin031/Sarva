"use client";

import { createContext, useContext, type ReactElement } from "react";
import type { CharacterId, Mood } from "@/lib/learn/types";
import { Brush, Bulb, Chain, Esteare, HalfMoon, HosnTalil, Iham, Likeness, Mafool, Majaz, Mane, Masked, Motammam, MozafElayh, Nahad, Paradox, Sefat, Spotlit, Swap, Target, Tashbih, Tick } from "./Characters";

/** آنچه از یک شخصیت به شکلِ قدم‌ها می‌رسد: چهره‌اش، نشانی که روی جواب درست
 *  می‌گذارد، و لحنِ جمله‌های آماده‌ای که کدِ مشترک می‌سازد. جمله‌ها رشته‌اند
 *  و نه تابع، چون درس از سمتِ سرور به پلیر پاس می‌شود. */
export type Persona = {
  Face: (props: { mood?: Mood; className?: string }) => ReactElement;
  /** کلمه روی کارت‌ها و دانه‌های شکارشده: کنهٔ متمم، نقابِ ایهام. */
  Chip: (props: { label: string; className?: string }) => ReactElement;
  /** روی کلمهٔ درست می‌نشیند. */
  mark: string;
  /** جوابِ غلط، وقتی سطر توضیح اختصاصی ندارد. `%کلمه%` جای همان کلمه را می‌گیرد. */
  miss: string;
  /** برچسبِ دو دکمهٔ داوری. */
  judge: [yes: string, no: string];
  /** بعد از چند اشتباه، جواب خودش چشمک بزند.
   *
   *  ⚠️ این عدد درس‌به‌درس فرق می‌کند و نباید از `hint` حدس زده شود:
   *  در متمم، جواب معمولاً یکی از دو سه کلمهٔ بعد از حرف اضافه‌ست؛ در
   *  ایهام هر کلمهٔ سطر نامزد است، پس دو تا اشتباه هیچ یعنی ندارد و چشمکِ
   *  زودرس جواب را مجانی لو می‌دهد. */
  glow: number;
  /** تیترِ صفحهٔ پایان. */
  finish: string;
  /** پلهٔ اولِ راهنمایی — فقط درسی که چیزی برای رنگی‌کردن دارد. `undefined`
   *  یعنی یک‌راست برو سراغ چشمک‌زدنِ جواب. */
  hint?: { when: string; miss: string };
};

export const PERSONAS: Record<CharacterId, Persona> = {
  motammam: {
    Face: Motammam,
    Chip: Tick,
    mark: "👑",
    miss: "نه، «%کلمه%» نیست. اول حرف اضافه رو پیدا کن.",
    judge: ["متممه", "متمم نیست"],
    glow: 3,
    finish: "سلطان‌یاب شدی! 👑",
    hint: { when: "حرف‌های اضافه رو برات رنگی کردم.", miss: "«{{%کلمه%}}» خودش حرف اضافه‌ست. متمم کلمهٔ ==بعدیشه==." },
  },
  iham: {
    Face: Iham,
    Chip: Masked,
    mark: "🎭",
    miss: "«%کلمه%» اینجا فقط یه معنی داره. دنبال کلمه‌ای بگرد که ==دو جور== خونده می‌شه.",
    judge: ["ایهام داره", "نداره"],
    glow: 4,
    finish: "نقاب‌بردار شدی! 🎭",
  },
  tashbih: {
    Face: Tashbih,
    Chip: Likeness,
    mark: "👥",
    miss: "«%کلمه%» این رکن نیست. دوباره سطر رو بخون و ببین ==چی به چی== مانند شده.",
    judge: ["تشبیهه", "تشبیه نیست"],
    glow: 4,
    finish: "آینه‌دار شدی! 👥",
  },
  nahad: {
    Face: Nahad,
    Chip: Spotlit,
    mark: "⭐",
    miss: "«%کلمه%» نهاد نیست. اول ==فعل== رو پیدا کن، بعد بپرس «چه کسی؟ / چه چیزی؟».",
    judge: ["نهاده", "نهاد نیست"],
    glow: 3,
    finish: "نهادیاب شدی! ⭐",
  },
  mafool: {
    Face: Mafool,
    Chip: Target,
    mark: "🎯",
    miss: "«%کلمه%» مفعول نیست. فعل رو پیدا کن و بپرس «چه کسی ==را==؟ / چه چیزی ==را==؟».",
    judge: ["مفعوله", "مفعول نیست"],
    glow: 3,
    finish: "مفعول‌شکار شدی! 🎯",
  },
  majaz: {
    Face: Majaz,
    Chip: Swap,
    mark: "🔁",
    miss: "«%کلمه%» اینجا توی همون معنیِ خودشه. دنبالِ کلمه‌ای بگرد که ==یه چیزِ دیگه== رو می‌خواد.",
    judge: ["مجازه", "مجاز نیست"],
    glow: 3,
    finish: "مجازشناس شدی! 🔁",
  },
  esteare: {
    Face: Esteare,
    Chip: Mane,
    mark: "🦁",
    miss: "«%کلمه%» اینجا توی معنیِ خودشه. دنبالِ کلمه‌ای بگرد که ==به خاطرِ شباهت== جای یه چیزِ دیگه نشسته.",
    judge: ["استعاره‌ست", "استعاره نیست"],
    glow: 3,
    finish: "شیرشناس شدی! 🦁",
  },
  hosnTalil: {
    Face: HosnTalil,
    Chip: Bulb,
    mark: "💡",
    miss: "«%کلمه%» اون علتِ خیالی نیست. اول بپرس «چرا این اتفاق افتاد؟» و جوابِ ==شاعرانه== رو پیدا کن.",
    judge: ["حسن تعلیله", "نیست"],
    glow: 3,
    finish: "علت‌تراش شدی! 💡",
  },
  paradox: {
    Face: Paradox,
    Chip: HalfMoon,
    mark: "🌗",
    miss: "«%کلمه%» جزوِ گره نیست. دنبالِ دو تا وصفِ ناسازگار بگرد که مالِ ==یه چیز== باشن.",
    judge: ["متناقض‌نماست", "نیست"],
    glow: 3,
    finish: "گره‌گشا شدی! 🌗",
  },
  mozafElayh: {
    Face: MozafElayh,
    Chip: Chain,
    mark: "🔗",
    miss: "«%کلمه%» اون نیست. بپرس «==مالِ کی؟ مربوط به چی؟==»؛ مضاف‌الیه نسبت می‌سازه، نه ویژگی.",
    judge: ["مضاف‌الیهه", "نیست"],
    glow: 3,
    finish: "زنجیرباز شدی! 🔗",
  },
  sefat: {
    Face: Sefat,
    Chip: Brush,
    mark: "🎨",
    miss: "«%کلمه%» اون نیست. بپرس «==چه‌جور؟ کدوم؟ چندتا؟==»؛ صفت خودِ اسم رو توصیف یا مشخص می‌کنه.",
    judge: ["صفته", "صفت نیست"],
    glow: 3,
    finish: "رنگ‌شناس شدی! 🎨",
  },
};

type Stage = { persona: Persona; host: string; name: string };

const LessonContext = createContext<Stage>({ persona: PERSONAS.motammam, host: "متمم", name: "رفیق" });

export const LessonStage = LessonContext.Provider;
export const useStage = () => useContext(LessonContext);

/** `%نام%` را با نام کوچکِ کاربر عوض می‌کند. */
export const speak = (text: string, name: string) => text.replaceAll("%نام%", name);
