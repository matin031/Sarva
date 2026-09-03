/**
 * ثابت‌های گزارشِ محتوا — مشترکِ مرورگر و سرور.
 *
 * عمداً بدون "server-only": هم دکمهٔ گزارش در مرورگر و هم اعتبارسنجیِ سرور
 * از همین یک فهرست می‌خوانند. دو فهرستِ جدا یعنی روزی یکی‌شان از قلم
 * می‌افتد و کاربر دلیلی می‌فرستد که سرور نمی‌شناسد.
 *
 * ⚠️ این فهرست‌ها با `check` constraint در migration ۰۰۹ آینه شده‌اند. اگر
 * عضوِ تازه‌ای اضافه شد، migration تازه هم لازم است — وگرنه درج با خطای
 * check برمی‌گردد.
 */

export const REPORT_AREAS = [
  "quiz",
  "exam",
  "vocab",
  "grammar_circuit",
  "aruz_rapid",
  "aruz_bridge",
  "jasoos",
  "ninja",
  "pairs",
  "doroos",
  "other",
] as const;

export type ReportArea = (typeof REPORT_AREAS)[number];

export const REPORT_AREA_LABELS: Record<ReportArea, string> = {
  quiz: "عروض سماعی",
  exam: "امتحانات نهایی",
  vocab: "واژه‌یاب",
  grammar_circuit: "مدار دستور",
  aruz_rapid: "کوتاه یا بلند؟",
  aruz_bridge: "پلِ وزن",
  jasoos: "جاسوسِ نقش‌ها",
  ninja: "نینجای دستور",
  pairs: "جفت‌های ادبی",
  doroos: "درسنامه",
  other: "سایر",
};


export const REPORT_REASONS = [
  "wrong_answer",
  "wrong_content",
  "typo",
  "audio",
  "image",
  "duplicate",
  "unclear",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** برچسبِ کوتاه برای دکمه‌های انتخاب، و یک توضیحِ یک‌خطی زیرش. */
export const REPORT_REASON_LABELS: Record<
  ReportReason,
  { label: string; hint: string }
> = {
  wrong_answer: {
    label: "پاسخِ درست اشتباه است",
    hint: "گزینه‌ای که درست علامت خورده، درست نیست",
  },
  wrong_content: {
    label: "محتوا غلط است",
    hint: "بیت، واژه یا نقشِ نوشته‌شده اشتباه است",
  },
  typo: { label: "غلط املایی", hint: "اشتباهِ نگارشی یا اعراب‌گذاری" },
  audio: { label: "مشکل صوت", hint: "پخش نمی‌شود یا با گزینه نمی‌خواند" },
  image: { label: "مشکل تصویر", hint: "نمایش داده نمی‌شود یا بی‌ربط است" },
  duplicate: { label: "تکراری است", hint: "این پرسش قبلاً آمده بود" },
  unclear: { label: "مبهم است", hint: "صورتِ پرسش روشن نیست" },
  other: { label: "چیز دیگری", hint: "در توضیح بنویسید" },
};

/**
 * دلیل‌هایی که در هر بخش معنی می‌دهند.
 *
 * نشان دادنِ «مشکل صوت» در بازی‌ای که اصلاً صوت ندارد، فقط کاربر را گیج
 * می‌کند و گزارش‌های بی‌ربط می‌سازد.
 */
export const REASONS_BY_AREA: Record<ReportArea, readonly ReportReason[]> = {
  quiz: ["wrong_answer", "wrong_content", "audio", "typo", "duplicate", "unclear", "other"],
  exam: ["wrong_answer", "wrong_content", "typo", "unclear", "other"],
  vocab: ["wrong_answer", "wrong_content", "image", "typo", "duplicate", "other"],
  grammar_circuit: ["wrong_answer", "wrong_content", "typo", "unclear", "other"],
  aruz_rapid: ["wrong_answer", "wrong_content", "typo", "unclear", "other"],
  aruz_bridge: ["wrong_answer", "wrong_content", "typo", "duplicate", "other"],
  jasoos: ["wrong_answer", "wrong_content", "typo", "unclear", "other"],
  ninja: ["wrong_content", "duplicate", "typo", "other"],
  pairs: ["wrong_content", "duplicate", "typo", "other"],
  doroos: ["wrong_content", "typo", "unclear", "other"],
  other: ["wrong_content", "typo", "unclear", "other"],
};

export const REPORT_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "باز",
  in_review: "در حال بررسی",
  resolved: "رسیدگی شد",
  rejected: "رد شد",
};

/** سقفِ طولِ توضیحِ کاربر. هم برای فرم و هم برای اعتبارسنجیِ سرور. */
export const REPORT_NOTE_MAX = 500;
/** سقفِ طولِ عکسِ متنِ محتوا. */
export const REPORT_SNAPSHOT_MAX = 600;
/** تعداد گزارش در هر صفحهٔ پنل. */
export const REPORT_PAGE_SIZE = 30;
