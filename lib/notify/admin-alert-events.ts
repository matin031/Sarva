/**
 * رویدادهایی که برای **مدیرِ سایت** ایمیل می‌شوند.
 *
 * ⚠️ عمداً بدونِ هیچ import ای — همان قاعدهٔ `./events.ts`: هم تستِ
 * `node --test` می‌خواندش و هم صفحهٔ تنظیماتِ پنل (کامپوننتِ کلاینت).
 *
 * ── مرز با `./events.ts` ────────────────────────────────────────────────────
 *
 * آن فهرست پیام‌هایی است که به **کاربر** می‌رود (خوش‌آمد، رسیدِ خرید).
 * این یکی خبری است که به **مدیر** می‌رسد: «یک نفر ثبت‌نام کرد»، «یک خرید
 * انجام شد». گیرنده، رضایت، دروازه‌ها و خطرشان فرق دارد، پس یک جدولِ جدا
 * دارند و هیچ‌کدام از فهرستِ دیگری عضو نمی‌گیرد.
 */

export const ADMIN_ALERT_EVENTS = [
  "signup",
  "purchase",
  "teacher_request",
  "content_report",
  "ticket",
  "club_post",
  "server_error",
] as const;

export type AdminAlertEvent = (typeof ADMIN_ALERT_EVENTS)[number];

export type AdminAlertSpec = {
  /** برچسبِ فارسی — در تنظیمات و در موضوعِ ایمیل. */
  label: string;
  /** یک جمله: این ایمیل کِی می‌رود. */
  when: string;
  /**
   * سقفِ ایمیل در یک ساعت، برای هر فرایند.
   *
   * ⚠️ بدونِ سقف، یک موجِ ثبت‌نامِ کلاسی (سی دانش‌آموز در پنج دقیقه) یا یک
   * باگی که ده خطای تازه پشتِ هم بسازد، صندوقِ مدیر را پر می‌کند — و
   * سرویسِ ایمیل، فرستنده‌ای را که ناگهان صد ایمیل می‌فرستد اسپم می‌شناسد،
   * یعنی ایمیلِ تأییدِ کاربران هم پشتِ سرش گیر می‌افتد.
   */
  hourlyCap: number;
};

export const ADMIN_ALERT_SPECS: Record<AdminAlertEvent, AdminAlertSpec> = {
  signup: {
    label: "ثبت‌نامِ کاربرِ تازه",
    when: "بلافاصله بعد از ساخته شدنِ هر حساب (ایمیل، موبایل یا گوگل).",
    hourlyCap: 30,
  },
  purchase: {
    label: "خریدِ سروا پلاس",
    when: "بعد از تأییدِ هر پرداخت — خریدِ تازه یا تمدید.",
    // ⚠️ سقفِ بالا: خبرِ پول نباید زیرِ سقف گم شود.
    hourlyCap: 200,
  },
  teacher_request: {
    label: "درخواستِ دبیری",
    when: "وقتی کسی مدارکِ دبیری‌اش را برای بررسی می‌فرستد.",
    hourlyCap: 30,
  },
  content_report: {
    label: "گزارشِ ایرادِ محتوا",
    when: "وقتی کاربری می‌گوید سؤال یا محتوایی ایراد دارد.",
    hourlyCap: 20,
  },
  ticket: {
    label: "تیکتِ پشتیبانی",
    when: "تیکتِ تازه، یا پاسخِ تازهٔ کاربر در یک تیکتِ باز.",
    hourlyCap: 30,
  },
  club_post: {
    label: "سرودهٔ تازه در کلاب",
    when: "وقتی سروده‌ای برای بررسی فرستاده می‌شود.",
    hourlyCap: 20,
  },
  server_error: {
    label: "خطای تازه روی سرور",
    when: "فقط اولین بارِ هر خطا — تکرارِ همان خطا ایمیلِ دوباره نمی‌سازد.",
    hourlyCap: 10,
  },
};

/** کلیدِ تنظیماتِ روشن/خاموشِ هر رویداد. */
export function adminAlertSettingKey<E extends AdminAlertEvent>(event: E): `alerts.${E}` {
  return `alerts.${event}`;
}

/** سقفِ تعدادِ گیرنده — این یک فهرستِ پستی نیست. */
export const MAX_ALERT_RECIPIENTS = 10;

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * فهرستِ گیرنده‌ها از متنِ تنظیمات.
 *
 * ویرگول، ویرگولِ فارسی، نقطه‌ویرگول، فاصله و خطِ تازه همه جداکننده‌اند —
 * مدیر این را از هر جایی کپی می‌کند. تکراری‌ها یکی می‌شوند و نشانیِ
 * نامعتبر جدا برمی‌گردد تا تنظیمات بتواند همان را نشان بدهد.
 */
export function parseAlertRecipients(raw: string | null | undefined): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(/[\s,،;؛]+/)) {
    const address = part.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    (EMAIL_RE.test(address) ? valid : invalid).push(address);
  }
  return { valid, invalid };
}

/** «روشن» بودنِ یک مقدارِ تنظیمات؛ `null` یعنی پیش‌فرض. */
export function alertSettingOn(value: string | null | undefined, fallback: boolean): boolean {
  if (value === null || value === undefined || !value.trim()) return fallback;
  const v = value.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

/**
 * پنجرهٔ لغزانِ یک‌ساعته برای سقفِ ایمیل.
 *
 * ⚠️ در حافظهٔ فرایند و نه دیتابیس — عمداً. سقف برای جلوگیری از سیل است و
 * نه یک شمارشِ دقیق؛ اگر سرور ری‌استارت شود و چند ایمیل بیشتر برود، ضرری
 * نیست. در عوض، مسیرِ ثبت‌نام و خرید برای این یک کوئریِ اضافه نمی‌خورد.
 */
export class HourlyThrottle {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly windowMs = 60 * 60 * 1000) {}

  /** اگر زیرِ سقف باشد یکی ثبت می‌کند و `true` می‌دهد. */
  take(key: string, cap: number, now = Date.now()): boolean {
    const fresh = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (fresh.length >= cap) {
      this.hits.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.hits.set(key, fresh);
    return true;
  }
}
