import type { RapidAruzQuestion } from "./types";

/*
 * ─────────────────────────────────────────────────────────────
 * DEMO ONLY
 * NOT VERIFIED EDUCATIONAL CONTENT
 * DO NOT USE AS AUTHORITATIVE ARUZ DATA
 * ─────────────────────────────────────────────────────────────
 *
 * این‌ها دادهٔ نمایشی‌اند تا بازی بدون بک‌اند کار کند. هیچ‌کدام از سرِ
 * کتابِ درسی یا منبعِ تأییدشدهٔ سروا نیامده و هیچ‌کدام نباید به‌عنوانِ
 * مرجعِ تقطیع به دانش‌آموز معرفی شود. وقتی جدول/API واقعی آماده شد، همین
 * شکلِ داده از آنجا می‌آید و این فایل کنار می‌رود (نگاه کنید به source.ts).
 *
 * دربارهٔ revealProgress: عددها دستی و یک‌بار حساب شده‌اند — نسبتِ
 * تجمعیِ نویسه‌های previewText که تا پایانِ هر واحد پوشیده می‌شود (فاصله و
 * نیم‌فاصله به واحدِ قبل چسبیده). بازی هیچ‌وقت این عددها را از متن استخراج
 * نمی‌کند؛ فقط می‌خواندشان.
 *
 * ⚠️ در «بِشْنَو اَز نِی» ادغامِ عروضی هست: «نَو اَز» به «نَ» + «وَز»
 * تقطیع می‌شود. یعنی متنِ واحد لزوماً زیررشتهٔ متنِ کامل نیست — و همین
 * دلیلِ آن است که واحدها باید از داده بیایند، نه از شکستنِ رشته.
 */

export const DEMO_RAPID_ARUZ_QUESTIONS: RapidAruzQuestion[] = [
  {
    id: "demo-w-sahar",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "سَحَر",
    explanation: "سَ کوتاه است و حَر بلند.",
    units: [
      { id: "demo-w-sahar-1", display: "سَ", length: "short", revealProgress: 0.4 },
      { id: "demo-w-sahar-2", display: "حَر", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-w-bahar",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "بَهار",
    units: [
      { id: "demo-w-bahar-1", display: "بَ", length: "short", revealProgress: 0.4 },
      { id: "demo-w-bahar-2", display: "هار", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-w-ketab",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "کِتاب",
    units: [
      { id: "demo-w-ketab-1", display: "کِ", length: "short", revealProgress: 0.4 },
      { id: "demo-w-ketab-2", display: "تاب", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-w-dela",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "دِلا",
    units: [
      { id: "demo-w-dela-1", display: "دِ", length: "short", revealProgress: 0.5 },
      { id: "demo-w-dela-2", display: "لا", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-w-setare",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "سَتارِه",
    units: [
      { id: "demo-w-setare-1", display: "سَ", length: "short", revealProgress: 0.2857 },
      { id: "demo-w-setare-2", display: "تا", length: "long", revealProgress: 0.5714 },
      { id: "demo-w-setare-3", display: "رِه", length: "short", revealProgress: 1 },
    ],
  },
  {
    id: "demo-w-parande",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "پَرَنْدِه",
    units: [
      { id: "demo-w-parande-1", display: "پَ", length: "short", revealProgress: 0.2222 },
      { id: "demo-w-parande-2", display: "رَنْ", length: "long", revealProgress: 0.6667 },
      { id: "demo-w-parande-3", display: "دِه", length: "short", revealProgress: 1 },
    ],
  },
  {
    // نیم‌فاصله در متن هست و باید دست‌نخورده بماند.
    id: "demo-w-miravad",
    type: "word",
    difficulty: 1,
    isDemo: true,
    previewText: "می‌رَوَد",
    units: [
      { id: "demo-w-miravad-1", display: "می", length: "long", revealProgress: 0.375 },
      { id: "demo-w-miravad-2", display: "رَ", length: "short", revealProgress: 0.625 },
      { id: "demo-w-miravad-3", display: "وَد", length: "long", revealProgress: 1 },
    ],
  },

  {
    id: "demo-p-bade-saba",
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "بادِ صَبا",
    units: [
      { id: "demo-p-bade-saba-1", display: "با", length: "long", revealProgress: 0.2222 },
      { id: "demo-p-bade-saba-2", display: "دِ", length: "short", revealProgress: 0.5556 },
      { id: "demo-p-bade-saba-3", display: "صَ", length: "short", revealProgress: 0.7778 },
      { id: "demo-p-bade-saba-4", display: "با", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-p-shabe-tar",
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "شَبِ تار",
    units: [
      { id: "demo-p-shabe-tar-1", display: "شَ", length: "short", revealProgress: 0.25 },
      { id: "demo-p-shabe-tar-2", display: "بِ", length: "short", revealProgress: 0.625 },
      { id: "demo-p-shabe-tar-3", display: "تار", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-p-rahe-dur",
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "راهِ دور",
    units: [
      { id: "demo-p-rahe-dur-1", display: "را", length: "long", revealProgress: 0.25 },
      { id: "demo-p-rahe-dur-2", display: "هِ", length: "short", revealProgress: 0.625 },
      { id: "demo-p-rahe-dur-3", display: "دور", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-p-dele-ma",
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "دِلِ ما",
    units: [
      { id: "demo-p-dele-ma-1", display: "دِ", length: "short", revealProgress: 0.2857 },
      { id: "demo-p-dele-ma-2", display: "لِ", length: "short", revealProgress: 0.7143 },
      { id: "demo-p-dele-ma-3", display: "ما", length: "long", revealProgress: 1 },
    ],
  },
  {
    id: "demo-p-chashme-siah",
    hasUnitTextOverlap: true,
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "چَشْمِ سیاه",
    units: [
      { id: "demo-p-chashme-siah-1", display: "چَشْ", length: "long", revealProgress: 0.3636 },
      { id: "demo-p-chashme-siah-2", display: "مِ", length: "short", revealProgress: 0.6364 },
      { id: "demo-p-chashme-siah-3", display: "سی", length: "long", revealProgress: 0.8182 },
      { id: "demo-p-chashme-siah-4", display: "یاه", length: "long", revealProgress: 1 },
    ],
  },
  {
    // تشدید: «ل» دوبار حساب می‌شود — پایانِ یک هجا و آغازِ هجای بعد.
    id: "demo-p-moallem",
    hasUnitTextOverlap: true,
    type: "phrase",
    difficulty: 2,
    isDemo: true,
    previewText: "مُعَلِّم",
    units: [
      { id: "demo-p-moallem-1", display: "مُ", length: "short", revealProgress: 0.25 },
      { id: "demo-p-moallem-2", display: "عَلْ", length: "long", revealProgress: 0.75 },
      { id: "demo-p-moallem-3", display: "لِم", length: "long", revealProgress: 1 },
    ],
  },

  {
    id: "demo-h-tavana",
    type: "hemistich",
    difficulty: 3,
    isDemo: true,
    explanation: "فعولن فعولن فعولن فَعَل",
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
    difficulty: 3,
    isDemo: true,
    explanation: "فعولن فعولن فعولن فَعَل",
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
    id: "demo-h-beshno",
    hasUnitTextOverlap: true,
    type: "hemistich",
    difficulty: 3,
    isDemo: true,
    explanation: "فاعلاتن فاعلاتن فاعلن — «نَو اَز» با ادغام «نَ» و «وَز» می‌شود.",
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
