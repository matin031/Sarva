import "server-only";
import { randomBytes } from "node:crypto";
import { getSetting, setSetting } from "@/lib/settings";
import { DEFAULT_BRAND_SUMMARY, EMPTY_BRAND, type BrandProfile } from "./entity";
import { parseSameAs, type AiCrawlerPolicy, parseAiPolicy } from "./policy";

/**
 * خواندنِ تنظیماتِ سئو — با یک قاعدهٔ سخت: **هیچ‌کدام نباید صفحه را بشکند.**
 *
 * این مقدارها در `robots.txt`، `llms.txt` و صفحهٔ خانه خوانده می‌شوند، و هر
 * سه در زمانِ `next build` هم ساخته می‌شوند — جایی که در داکر اصلاً دیتابیسی
 * نیست. پس هر خواندن:
 *
 *   • در `try/catch` است و در شکست، پیش‌فرضِ امن را برمی‌گرداند؛
 *   • و سقفِ زمانی دارد، چون «دیتابیسِ در دسترس نیست» گاهی به‌جای خطای
 *     فوری، ده ثانیه انتظار برای اتصال است — و build نباید پشتِ آن بماند.
 *
 * پیش‌فرض‌ها همه «سایتِ کاملاً باز و قابلِ خزش»اند. اگر خواندن شکست بخورد،
 * بدترین نتیجه این است که `sameAs` یک ساعت دیرتر دیده شود — نه اینکه کلِ سایت
 * از گوگل بیرون بیفتد.
 */

const READ_TIMEOUT_MS = 2500;

async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((resolve) => {
        // ⚠️ `unref`: تایمرِ این مسابقه نباید پروسه را (مثلاً کارگرِ build) زنده نگه دارد.
        setTimeout(() => resolve(fallback), READ_TIMEOUT_MS).unref?.();
      }),
    ]);
  } catch {
    return fallback;
  }
}

export async function readBrandProfile(): Promise<BrandProfile> {
  return safeRead(async () => {
    const [sameAs, email, summary] = await Promise.all([
      getSetting("seo.same_as"),
      getSetting("seo.contact_email"),
      getSetting("seo.brand_summary"),
    ]);
    return {
      sameAs: parseSameAs(sameAs ?? ""),
      email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      summary: summary?.trim() || DEFAULT_BRAND_SUMMARY,
    };
  }, EMPTY_BRAND);
}

export async function readAiPolicy(): Promise<AiCrawlerPolicy> {
  return safeRead(async () => parseAiPolicy(await getSetting("seo.ai_crawlers")), "all");
}

export async function readVerification(): Promise<{ bing: string | null; yandex: string | null }> {
  return safeRead(
    async () => {
      const [bing, yandex] = await Promise.all([
        getSetting("seo.verify_bing"),
        getSetting("seo.verify_yandex"),
      ]);
      return { bing: bing || null, yandex: yandex || null };
    },
    { bing: null, yandex: null },
  );
}

/* ─────────────────────────────── IndexNow ─────────────────────────────── */

/** کلیدِ IndexNow اگر ساخته شده باشد. */
export async function readIndexNowKey(): Promise<string | null> {
  return safeRead(async () => {
    const key = await getSetting("seo.indexnow_key");
    return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
  }, null);
}

/**
 * کلید را اگر نیست می‌سازد.
 *
 * ۳۲ نویسهٔ هگز — در بازهٔ ۸ تا ۱۲۸ نویسه‌ای که پروتکل می‌خواهد. کلید راز
 * نیست (عمداً در `/indexnow-key.txt` منتشر می‌شود)؛ فقط ثابت می‌کند
 * فرستندهٔ فهرست، صاحبِ همین دامنه است.
 */
export async function ensureIndexNowKey(adminId: string): Promise<string> {
  const existing = await readIndexNowKey();
  if (existing) return existing;
  const key = randomBytes(16).toString("hex");
  await setSetting("seo.indexnow_key", key, adminId);
  return key;
}

/* ─────────────────────── وضعیتِ چک‌لیست و گزارش‌ها ─────────────────────── */

export type SeoState = {
  /** شناسهٔ کار ← زمانِ آخرین انجام (ISO). */
  done: Record<string, string>;
  /** آخرین ارسال به IndexNow. */
  indexNow?: { at: string; status: number; ok: boolean; count: number; message: string };
  /** نتیجهٔ آخرین آزمونِ دیده‌شدن در هوش مصنوعی، به ازای هر پرسش. */
  aiChecks?: Record<string, { at: string; seen: boolean }>;
};

const EMPTY_STATE: SeoState = { done: {} };

export async function readSeoState(): Promise<SeoState> {
  return safeRead(async () => {
    const raw = await getSetting("seo.state");
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<SeoState>;
    return {
      done: parsed.done && typeof parsed.done === "object" ? parsed.done : {},
      indexNow: parsed.indexNow,
      aiChecks: parsed.aiChecks && typeof parsed.aiChecks === "object" ? parsed.aiChecks : {},
    };
  }, EMPTY_STATE);
}

/**
 * ⚠️ خواندن-تغییر-نوشتن روی یک ردیف. دو مدیری که در یک لحظه دو تیکِ متفاوت
 * بزنند، یکی از دو تیک را از دست می‌دهند. برای یک چک‌لیستِ یک‌نفره این
 * معامله درست است؛ جدولِ جدا یعنی migration روی هاست، برای چیزی که بدترین
 * خرابی‌اش یک تیکِ جاافتاده است.
 */
export async function updateSeoState(
  adminId: string,
  mutate: (state: SeoState) => SeoState,
): Promise<SeoState> {
  const raw = await getSetting("seo.state");
  let current: SeoState = EMPTY_STATE;
  if (raw) {
    try {
      current = { ...EMPTY_STATE, ...(JSON.parse(raw) as SeoState) };
    } catch {
      current = EMPTY_STATE;
    }
  }
  const next = mutate(current);
  await setSetting("seo.state", JSON.stringify(next), adminId);
  return next;
}
