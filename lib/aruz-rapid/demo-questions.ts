import type { RapidAruzQuestion } from "./types";

/*
 * ─────────────────────────────────────────────────────────────
 * DEMO ONLY
 * NOT VERIFIED EDUCATIONAL CONTENT
 * DO NOT USE AS AUTHORITATIVE ARUZ DATA
 * ─────────────────────────────────────────────────────────────
 *
 * این‌ها دادهٔ نمایشی‌اند تا بازی بدون بک‌اند کار کند. هیچ‌کدام از منبعِ
 * تأییدشدهٔ سروا نیامده و هیچ‌کدام نباید به‌عنوانِ مرجعِ تقطیع به دانش‌آموز
 * معرفی شود. وقتی جدول/API واقعی آماده شد، همین شکلِ داده از آنجا می‌آید و
 * این فایل کنار می‌رود (نگاه کنید به source.ts).
 *
 * ✔️ هر پنج مصراع با موتورِ عروضِ خودِ سروا وارسی شده‌اند:
 *    `npx tsx scripts/verify-aruz-rapid.ts`
 *    الگوی دستیِ کوتاه/بلند با وزنِ تشخیص‌دادهٔ موتور مقایسه می‌شود. این
 *    وارسی در زمانِ نوشتنِ داده انجام می‌شود، نه در بازی — بازی هرگز تقطیع
 *    تولید نمی‌کند.
 *
 * دربارهٔ revealProgress: عددها دستی و یک‌بار حساب شده‌اند — نسبتِ تجمعیِ
 * نویسه‌های previewText که تا پایانِ هر واحد پوشیده می‌شود (فاصله و
 * نیم‌فاصله به واحدِ قبل چسبیده).
 *
 * ⚠️ در «بِشْنَو اَز نِی» ادغامِ عروضی هست: «نَو اَز» به «نَ» + «وَز» تقطیع
 * می‌شود، و در «آدَم اَعْضای» به «دَ» + «مَعْ». یعنی متنِ واحد لزوماً
 * زیررشتهٔ متنِ کامل نیست — و همین دلیلِ آن است که واحدها باید از داده
 * بیایند، نه از شکستنِ رشته.
 */

export const DEMO_RAPID_ARUZ_QUESTIONS: RapidAruzQuestion[] = [
  {
    id: "demo-h-tavana",
    type: "hemistich",
    isDemo: true,
    meter: "فعولن فعولن فعولن فَعَل",
    attribution: "فردوسی",
    previewText: "تَوانا بُوَد هَر کِه دانا بُوَد",
    units: [
      { id: "demo-h-tavana-1", display: "تَ", length: "short", revealProgress: 0.0645 },
      { id: "demo-h-tavana-2", display: "وا", length: "long", revealProgress: 0.129 },
      { id: "demo-h-tavana-3", display: "نا", length: "long", revealProgress: 0.2258 },
      { id: "demo-h-tavana-4", display: "بُ", length: "short", revealProgress: 0.2903 },
      { id: "demo-h-tavana-5", display: "وَد", length: "long", revealProgress: 0.4194 },
      { id: "demo-h-tavana-6", display: "هَر", length: "long", revealProgress: 0.5484 },
      { id: "demo-h-tavana-7", display: "کِه", length: "short", revealProgress: 0.6774 },
      { id: "demo-h-tavana-8", display: "دا", length: "long", revealProgress: 0.7419 },
      { id: "demo-h-tavana-9", display: "نا", length: "long", revealProgress: 0.8387 },
      { id: "demo-h-tavana-10", display: "بُ", length: "short", revealProgress: 0.9032 },
      { id: "demo-h-tavana-11", display: "وَد", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-h-khodaya",
    type: "hemistich",
    isDemo: true,
    meter: "فعولن فعولن فعولن فَعَل",
    attribution: "نظامی",
    previewText: "خُدایا چُنان کُن سَرانْجامِ کار",
    units: [
      { id: "demo-h-khodaya-1", display: "خُ", length: "short", revealProgress: 0.0645 },
      { id: "demo-h-khodaya-2", display: "دا", length: "long", revealProgress: 0.129 },
      { id: "demo-h-khodaya-3", display: "یا", length: "long", revealProgress: 0.2258 },
      { id: "demo-h-khodaya-4", display: "چُ", length: "short", revealProgress: 0.2903 },
      { id: "demo-h-khodaya-5", display: "نان", length: "long", revealProgress: 0.4194 },
      { id: "demo-h-khodaya-6", display: "کُن", length: "long", revealProgress: 0.5484 },
      { id: "demo-h-khodaya-7", display: "سَ", length: "short", revealProgress: 0.6129 },
      { id: "demo-h-khodaya-8", display: "رانْ", length: "long", revealProgress: 0.7419 },
      { id: "demo-h-khodaya-9", display: "جا", length: "long", revealProgress: 0.8065 },
      { id: "demo-h-khodaya-10", display: "مِ", length: "short", revealProgress: 0.9032 },
      { id: "demo-h-khodaya-11", display: "کار", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-h-biya",
    type: "hemistich",
    isDemo: true,
    meter: "فعولن فعولن فعولن فَعَل",
    attribution: "فردوسی",
    previewText: "بِیا تا جَهان را بِه بَد نَسْپَریم",
    units: [
      { id: "demo-h-biya-1", display: "بِ", length: "short", revealProgress: 0.0588 },
      { id: "demo-h-biya-2", display: "یا", length: "long", revealProgress: 0.1471 },
      { id: "demo-h-biya-3", display: "تا", length: "long", revealProgress: 0.2353 },
      { id: "demo-h-biya-4", display: "جَ", length: "short", revealProgress: 0.2941 },
      { id: "demo-h-biya-5", display: "هان", length: "long", revealProgress: 0.4118 },
      { id: "demo-h-biya-6", display: "را", length: "long", revealProgress: 0.5 },
      { id: "demo-h-biya-7", display: "بِه", length: "short", revealProgress: 0.6176 },
      { id: "demo-h-biya-8", display: "بَد", length: "long", revealProgress: 0.7353 },
      { id: "demo-h-biya-9", display: "نَسْ", length: "long", revealProgress: 0.8529 },
      { id: "demo-h-biya-10", display: "پَ", length: "short", revealProgress: 0.9118 },
      { id: "demo-h-biya-11", display: "ریم", length: "long", revealProgress: 1 },
    ],
  },
  {
    // ادغام: «آدَم اَعْضای» به «دَ» + «مَعْ» تقطیع می‌شود.
    id: "demo-h-bani-adam",
    type: "hemistich",
    isDemo: true,
    hasUnitTextOverlap: true,
    meter: "فعولن فعولن فعولن فَعَل",
    attribution: "سعدی",
    previewText: "بَنی آدَم اَعْضایِ یِکْدیگَرَند",
    units: [
      { id: "demo-h-bani-adam-1", display: "بَ", length: "short", revealProgress: 0.0645 },
      { id: "demo-h-bani-adam-2", display: "نی", length: "long", revealProgress: 0.1613 },
      { id: "demo-h-bani-adam-3", display: "آ", length: "long", revealProgress: 0.1935 },
      { id: "demo-h-bani-adam-4", display: "دَ", length: "short", revealProgress: 0.2581 },
      { id: "demo-h-bani-adam-5", display: "مَعْ", length: "long", revealProgress: 0.4516 },
      { id: "demo-h-bani-adam-6", display: "ضا", length: "long", revealProgress: 0.5161 },
      { id: "demo-h-bani-adam-7", display: "یِ", length: "short", revealProgress: 0.6129 },
      { id: "demo-h-bani-adam-8", display: "یِکْ", length: "long", revealProgress: 0.7419 },
      { id: "demo-h-bani-adam-9", display: "دی", length: "long", revealProgress: 0.8065 },
      { id: "demo-h-bani-adam-10", display: "گَ", length: "short", revealProgress: 0.871 },
      { id: "demo-h-bani-adam-11", display: "رَند", length: "long", revealProgress: 1 },
    ],
  },
  {
    // ادغام: «نَو اَز» به «نَ» + «وَز» تقطیع می‌شود.
    id: "demo-h-beshno",
    type: "hemistich",
    isDemo: true,
    hasUnitTextOverlap: true,
    meter: "فاعلاتن فاعلاتن فاعلن",
    attribution: "مولوی",
    previewText: "بِشْنَو اَز نِی چون حِکایَت می‌کُنَد",
    units: [
      { id: "demo-h-beshno-1", display: "بِشْ", length: "long", revealProgress: 0.1111 },
      { id: "demo-h-beshno-2", display: "نَ", length: "short", revealProgress: 0.1667 },
      { id: "demo-h-beshno-3", display: "وَز", length: "long", revealProgress: 0.3056 },
      { id: "demo-h-beshno-4", display: "نِی", length: "long", revealProgress: 0.4167 },
      { id: "demo-h-beshno-5", display: "چون", length: "long", revealProgress: 0.5278 },
      { id: "demo-h-beshno-6", display: "حِ", length: "short", revealProgress: 0.6111 },
      { id: "demo-h-beshno-7", display: "کا", length: "long", revealProgress: 0.6667 },
      { id: "demo-h-beshno-8", display: "یَت", length: "long", revealProgress: 0.75 },
      { id: "demo-h-beshno-9", display: "می", length: "long", revealProgress: 0.8611 },
      { id: "demo-h-beshno-10", display: "کُ", length: "short", revealProgress: 0.9167 },
      { id: "demo-h-beshno-11", display: "نَد", length: "long", revealProgress: 1 },
    ],
  },
];
