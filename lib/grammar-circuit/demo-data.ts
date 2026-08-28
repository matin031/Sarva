// ─────────────────────────────────────────────────────────────────────────────
// DEMO ONLY
// NOT VERIFIED EDUCATIONAL CONTENT
// DO NOT USE AS PRODUCTION GRAMMAR DATA
//
// این فایل فقط برای این است که بازی بدون جدول/اندپوینتِ اختصاصی قابلِ اجرا و
// آزمون باشد. تحلیل‌های زیر ساده و مدرسه‌ای‌اند و از منبعِ معتبرِ سروا نیامده‌اند؛
// وقتی منبعِ واقعی آماده شد، همین شکلِ داده از سرور می‌آید و این فایل کنار
// می‌رود. هیچ‌جای بازی به این فایل وابسته نیست جز `LocalGrammarCircuitSource`.
//
// دو نکته که عمداً رعایت شده است:
//   • هیچ توکنی در زمانِ اجرا از روی متن ساخته نمی‌شود؛ نیم‌فاصله، «،» و «.»
//     همه صریح در `separatorAfter` آمده‌اند.
//   • هیچ سوکتی بیش از یک نقش را نمی‌پذیرد. چندنقشی‌بودن فقط جایی مجاز است که
//     منبعِ علمی واقعاً چند تحلیل را معتبر بداند — و چون اینجا چنین منبعی در
//     کار نیست، عمداً از آن پرهیز شده. سازوکارِ چندنقشی و آزمونِ
//     بن‌بست‌ناپذیری‌اش در تست‌ها پوشش داده شده است.
// ─────────────────────────────────────────────────────────────────────────────

import type { GrammarCircuitQuestion, GrammarRoleDefinition } from "./types";

const ROLES: Record<string, GrammarRoleDefinition> = {
  subject: { key: "subject", label: "نهاد" },
  object: { key: "object", label: "مفعول" },
  predicate: { key: "predicate", label: "مسند" },
  complement: { key: "complement", label: "متمم" },
  verb: { key: "verb", label: "فعل" },
  adjective: { key: "adjective", label: "صفت" },
  possessive: { key: "possessive", label: "مضاف‌الیه" },
  adverb: { key: "adverb", label: "قید" },
  vocative: { key: "vocative", label: "منادا" },
};

const pick = (...keys: string[]) => keys.map((k) => ROLES[k]);

export const DEMO_GRAMMAR_CIRCUIT_QUESTIONS: GrammarCircuitQuestion[] = [
  {
    id: "gc-demo-baran",
    type: "sentence",
    isDemo: true,
    difficulty: 1,
    roleDefinitions: pick("adverb", "subject", "verb"),
    tokens: [
      { id: "t1", text: "دیروز", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["adverb"] } },
      { id: "t2", text: "باران", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t3", text: "بارید", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p-adverb-1", roleKey: "adverb" },
      { id: "p-subject-1", roleKey: "subject" },
      { id: "p-verb-1", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t2", "t3"],
    explanation:
      "«دیروز» زمانِ انجامِ فعل را می‌گوید، پس قید است؛ «باران» انجام‌دهندهٔ «بارید» است، پس نهاد.",
  },

  {
    id: "gc-demo-hava",
    type: "sentence",
    isDemo: true,
    difficulty: 1,
    roleDefinitions: pick("subject", "adverb", "predicate", "verb"),
    tokens: [
      { id: "t1", text: "هوا", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t2", text: "امروز", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["adverb"] } },
      { id: "t3", text: "سرد", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["predicate"] } },
      { id: "t4", text: "است", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p-subject-1", roleKey: "subject" },
      { id: "p-adverb-1", roleKey: "adverb" },
      { id: "p-predicate-1", roleKey: "predicate" },
      { id: "p-verb-1", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t2", "t3", "t4"],
    explanation:
      "«است» فعلِ ربطی است و واژهٔ پس از آن، یعنی «سرد»، حالتِ نهاد را بیان می‌کند؛ پس مسند است.",
  },

  {
    // دو قطعهٔ «متمم» با شناسهٔ مستقل — هیچ‌کدام از دیگری قابلِ تشخیص نیست و
    // هر دو باید کار کنند.
    id: "gc-demo-parande",
    type: "sentence",
    isDemo: true,
    difficulty: 2,
    roleDefinitions: pick("subject", "complement", "verb"),
    tokens: [
      { id: "t1", text: "پرنده", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t2", text: "از", separatorAfter: " " },
      { id: "t3", text: "شاخه", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["complement"] } },
      { id: "t4", text: "به", separatorAfter: " " },
      { id: "t5", text: "آسمان", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["complement"] } },
      { id: "t6", text: "پرید", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p-subject-1", roleKey: "subject" },
      { id: "p-complement-1", roleKey: "complement" },
      { id: "p-complement-2", roleKey: "complement" },
      { id: "p-verb-1", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t3", "t5", "t6"],
    explanation:
      "«شاخه» و «آسمان» هرکدام پس از یک حرفِ اضافه («از» و «به») آمده‌اند و متمم‌اند.",
  },

  {
    // یک واژه («من») دو بار با دو نقشِ متفاوت — هیچ‌جای بازی نباید حالت را به
    // متنِ توکن گره بزند. نیم‌فاصلهٔ «می‌دهد» و ویرگول هم اینجا آزموده می‌شوند.
    id: "gc-demo-madar",
    type: "sentence",
    isDemo: true,
    difficulty: 2,
    roleDefinitions: pick("subject", "object", "possessive", "complement", "verb"),
    tokens: [
      { id: "t1", text: "مادر", separatorAfter: "، ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t2", text: "کتابِ", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["object"] } },
      { id: "t3", text: "من", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["possessive"] } },
      { id: "t4", text: "را", separatorAfter: " " },
      { id: "t5", text: "به", separatorAfter: " " },
      { id: "t6", text: "من", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["complement"] } },
      { id: "t7", text: "می‌دهد", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p-subject-1", roleKey: "subject" },
      { id: "p-object-1", roleKey: "object" },
      { id: "p-possessive-1", roleKey: "possessive" },
      { id: "p-complement-1", roleKey: "complement" },
      { id: "p-verb-1", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t2", "t3", "t6", "t7"],
    explanation:
      "«منِ» اول مالکِ کتاب است و مضاف‌الیه؛ «منِ» دوم پس از حرفِ اضافهٔ «به» آمده و متمم است.",
  },

  {
    id: "gc-demo-nezami",
    type: "hemistich",
    isDemo: true,
    difficulty: 2,
    attribution: "نظامی گنجوی",
    roleDefinitions: pick("vocative", "possessive", "adjective", "predicate"),
    tokens: [
      { id: "t1", text: "ای", separatorAfter: " " },
      { id: "t2", text: "نامِ", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["vocative"] } },
      { id: "t3", text: "تو", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["possessive"] } },
      { id: "t4", text: "بهترین", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["adjective"] } },
      { id: "t5", text: "سرآغاز", separatorAfter: "", roleSlot: { acceptedRoleKeys: ["predicate"] } },
    ],
    pieces: [
      { id: "p-vocative-1", roleKey: "vocative" },
      { id: "p-possessive-1", roleKey: "possessive" },
      { id: "p-adjective-1", roleKey: "adjective" },
      { id: "p-predicate-1", roleKey: "predicate" },
    ],
    circuitOrder: ["t2", "t3", "t4", "t5"],
    explanation:
      "«ای» نشانهٔ ندا است و «نام» مورد خطاب، پس منادا است؛ فعلِ ربطیِ «است» حذف شده و «سرآغاز» مسند می‌ماند.",
  },

  {
    // چند واژهٔ خیلی کوتاهِ پشتِ هم: آزمونِ حل‌کنندهٔ هم‌پوشانیِ سوکت‌ها و
    // خط‌های راهنما.
    id: "gc-demo-sepordam",
    type: "sentence",
    isDemo: true,
    difficulty: 3,
    roleDefinitions: pick("subject", "object", "complement", "verb"),
    tokens: [
      { id: "t1", text: "من", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t2", text: "تو", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["object"] } },
      { id: "t3", text: "را", separatorAfter: " " },
      { id: "t4", text: "به", separatorAfter: " " },
      { id: "t5", text: "او", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["complement"] } },
      { id: "t6", text: "سپردم", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p-subject-1", roleKey: "subject" },
      { id: "p-object-1", roleKey: "object" },
      { id: "p-complement-1", roleKey: "complement" },
      { id: "p-verb-1", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t2", "t5", "t6"],
    explanation:
      "«را» نشانهٔ مفعول است و پیش از آن «تو» مفعول است؛ «او» پس از حرفِ اضافهٔ «به» متمم است.",
  },
];
