/**
 * پاک‌سازی داده پیش از رفتن به لاگ.
 *
 * این فایل عمداً هیچ import ای از Next یا دیتابیس ندارد و "server-only" هم
 * نیست: باید بشود مستقیم در `node --test` صدایش زد. تنها راهِ مطمئن شدن از
 * اینکه رمز و توکن در لاگ نمی‌نشینند، تست کردنِ خودِ همین تابع است.
 *
 * ⚠️ چرا نسخهٔ قبلی کافی نبود: `redactMetadata` در lib/admin/audit.ts فقط
 * سطح اول شیء را نگاه می‌کرد. یعنی `{ payload: { password: "x" } }` بدون
 * دست‌خوردگی وارد جدول می‌شد — و چون خطاها هم شیء تودرتو دارند، همین الگو
 * در لاگ عملیاتی هم تکرار می‌شد.
 *
 * سه لایهٔ محافظت اینجا هست و هر سه لازم‌اند:
 *
 *   ۱) **نام کلید** — `password`, `token`, `apiKey` و امثالشان. جلوی چیزی را
 *      می‌گیرد که می‌دانیم راز است.
 *
 *   ۲) **شکل مقدار** — یک رشتهٔ ۶۴ نویسه‌ای hex راز است، حتی اگر کلیدش
 *      `value` باشد. جلوی چیزی را می‌گیرد که کلیدش را پیش‌بینی نکرده‌ایم.
 *
 *   ۳) **طول** — هر رشتهٔ بلند بریده می‌شود. متن سروده و دیدگاه از همین‌جا
 *      رد می‌شود، و لاگ هم با یک شیء چندمگابایتی منفجر نمی‌شود.
 */

/** آنچه به‌جای مقدار حساس می‌نشیند. فارسی است تا در پنل مدیریت هم خوانا باشد. */
export const REDACTED = "«پنهان»";

/** پیش از مقایسه، کلید به حروف کوچکِ صرفاً حرف‌وعدد تبدیل می‌شود:
 *  `API_Key`، `apiKey` و `api-key` هر سه می‌شوند `apikey`. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * کلیدهایی که «هرجای نامشان» بیاید، مقدار پنهان می‌شود.
 *
 * این‌ها بدون ابهام‌اند: هیچ کلید بی‌خطری در این پروژه نیست که `password` یا
 * `apikey` داخل نامش باشد.
 */
const SECRET_KEY_PARTS = [
  "password",
  "passwd",
  "passphrase",
  "secret",
  "token",
  "jwt",
  "bearer",
  "authorization",
  "cookie",
  "apikey",
  "accesskey",
  "privatekey",
  "credential",
  "pepper",
  "otp",
  "turnstile",
  "captcha",
  "signature",
  "connectionstring",
  "databaseurl",
  "dsn",
  // هر چیزی که هش شده باشد هم راز است: هشِ refresh token و هشِ کد بازنشانی
  // دقیقاً همان مقداری‌اند که دیتابیس ذخیره می‌کند، پس داشتنشان = داشتن سشن.
  "hash",
] as const;

/**
 * کلیدهایی که فقط اگر نام **به آن‌ها ختم شود** پنهان می‌شوند.
 *
 * «ختم شود» و نه «شامل باشد»، چون این‌ها کوتاه و پرتکرارند:
 * `actorEmail` باید پنهان شود ولی `mailDriver` نه، `clientIp` باید ولی
 * `ipRateLimit` نه.
 *
 * این فهرست فقط در نمایهٔ «عملیاتی» اعمال می‌شود — یعنی روی لاگی که به
 * stdout کانتینر می‌رود. لاگ ممیزی مدیران عمداً از آن معاف است، چون
 * ایمیلِ مدیر و IP اش دقیقاً همان چیزی است که آن جدول برای ثبتش ساخته شده.
 */
const PRIVATE_KEY_SUFFIXES = [
  "email",
  "mail",
  "phone",
  "mobile",
  "tel",
  "ip",
  "ipaddress",
  "useragent",
  "fullname",
  "firstname",
  "lastname",
  "username",
  "displayname",
  "filename",
  "originalname",
  "body",
  "content",
  "poem",
  "verse",
  "comment",
  "answer",
  "answers",
  "params",
  "query",
] as const;

/** نمایهٔ پاک‌سازی. */
export type RedactProfile =
  /** لاگ عملیاتی: راز + هویت + متن کاربر. سخت‌گیرانه‌ترین حالت. */
  | "operational"
  /** لاگ ممیزی مدیران: فقط راز. ایمیل و IP عمداً می‌مانند. */
  | "audit";

function isSecretKey(key: string): boolean {
  const k = normalizeKey(key);
  return SECRET_KEY_PARTS.some((part) => k.includes(part));
}

/**
 * کلید را به واژه‌هایش می‌شکند: `actor_email`، `actorEmail` و `ACTOR-EMAIL`
 * هر سه می‌شوند `["actor", "email"]`.
 *
 * چرا واژه و نه رشته: فهرست پایین واژه‌های کوتاهی مثل `ip` دارد و مقایسهٔ
 * «شامل باشد» روی `skip` هم می‌خورد. مقایسهٔ آخرین واژه این را حل می‌کند و
 * `clientIp` را می‌گیرد بی‌آنکه `skip` را از دست بدهد.
 */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function isPrivateKey(key: string): boolean {
  const words = keyWords(key);
  const last = words[words.length - 1];
  if (!last) return false;
  if ((PRIVATE_KEY_SUFFIXES as readonly string[]).includes(last)) return true;
  // نام‌های چسبیده که شکستن دوباره‌شان معنایی ندارد: `fullname`, `useragent`.
  const joined = words.join("");
  return (PRIVATE_KEY_SUFFIXES as readonly string[]).some((s) => joined === s);
}

// ---------------------------------------------------------------------------
// پاک‌سازی مقدارِ رشته‌ای
// ---------------------------------------------------------------------------

/** ایمیل داخل یک متن آزاد. پیام خطای پستگرس گاهی ایمیل را داخل خودش دارد. */
const EMAIL_IN_TEXT = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * رشتهٔ بلندِ hex/base64url — هش، توکن، امضا.
 *
 * تورِ آخر است، برای رازی که کلیدش را پیش‌بینی نکرده‌ایم. مرز ۴۰ نویسه
 * محافظه‌کارانه است: یک uuid (۳۶ نویسه) از آن رد می‌شود، یک هشِ sha256
 * (۶۴ نویسه) نه.
 *
 * ⚠️ `/` عمداً در مجموعهٔ نویسه‌ها **نیست**. با آن، مسیرهای داخل stack trace
 * («‎/app/.next/server/chunks/…») یک رشتهٔ بلندِ پیوسته به حساب می‌آمدند و
 * پنهان می‌شدند — یعنی stack دقیقاً همان چیزی را از دست می‌داد که به‌خاطرش
 * ذخیره‌اش می‌کنیم. توکن‌ها با همین الگو هم گرفته می‌شوند، چون بخش‌های یک
 * JWT با نقطه جدا می‌شوند و base64url اصلاً `/` ندارد.
 */
const SECRET_LOOKING = /\b[A-Za-z0-9+_=-]{40,}\b/g;

/** شمارهٔ موبایل ایرانی، با یا بدون کد کشور. */
const PHONE_IN_TEXT = /\b(?:\+?98|0)9\d{9}\b/g;

/** سقف طول هر رشته در لاگ. متن سروده و دیدگاه از همین‌جا کوتاه می‌شود. */
const MAX_STRING = 300;

/**
 * متن آزاد را برای لاگ امن می‌کند.
 *
 * روی *مقدار* کار می‌کند و نه روی کلید، پس چیزی را می‌گیرد که لایهٔ اول از
 * دستش می‌دهد: پیام خطایی که ایمیل کاربر داخلش است، یا توکنی که تصادفاً در
 * یک فیلد بی‌نام‌ونشان نشسته.
 *
 * @param maskIdentity ایمیل و شماره را هم بپوشاند؟ در لاگ عملیاتی بله. در
 *   لاگ ممیزی مدیران نه — آنجا «ایمیل آزمایشی به فلانی رفت» دقیقاً همان
 *   چیزی است که مدیر باید بعداً بتواند بخواند. رازها در هر دو حالت می‌روند.
 */
export function scrubText(value: string, maxLength = MAX_STRING, maskIdentity = true): string {
  let cleaned = value.replace(SECRET_LOOKING, "«راز»");
  if (maskIdentity) {
    cleaned = cleaned.replace(EMAIL_IN_TEXT, "«ایمیل»").replace(PHONE_IN_TEXT, "«شماره»");
  }

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
}

// ---------------------------------------------------------------------------
// پاک‌سازی بازگشتی
// ---------------------------------------------------------------------------

export type RedactOptions = {
  profile?: RedactProfile;
  /** سقف عمق. جلوی شیء حلقه‌دار و درختِ بی‌انتها را می‌گیرد. */
  maxDepth?: number;
  /** سقف تعداد عضو در آرایه. */
  maxArray?: number;
  /** سقف طول رشته. */
  maxString?: number;
};

const DEFAULTS = { maxDepth: 6, maxArray: 50, maxString: MAX_STRING } as const;

/**
 * هر مقداری را به یک مقدارِ امنِ قابلِ JSON تبدیل می‌کند.
 *
 * بازگشتی است و داخل آرایه‌ها هم می‌رود — همان چیزی که نسخهٔ قبلی نمی‌کرد.
 * شیء تکراری/حلقه‌دار با یک نشانگر جایگزین می‌شود تا `JSON.stringify` بعدی
 * هرگز روی «Converting circular structure» نیفتد.
 */
export function redactDeep(value: unknown, options: RedactOptions = {}): unknown {
  const opts = { ...DEFAULTS, ...options, profile: options.profile ?? "operational" };
  return walk(value, opts, 0, new WeakSet<object>());
}

function shouldHide(key: string, profile: RedactProfile): boolean {
  if (isSecretKey(key)) return true;
  return profile === "operational" && isPrivateKey(key);
}

function walk(
  value: unknown,
  opts: Required<RedactOptions>,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case "string":
      return scrubText(value, opts.maxString, opts.profile === "operational");
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return `${value}n`;
    case "function":
      return "«تابع»";
    case "symbol":
      return "«نماد»";
  }

  if (depth >= opts.maxDepth) return "«عمیق‌تر از حد مجاز»";

  const obj = value as object;
  if (seen.has(obj)) return "«ارجاع حلقوی»";
  seen.add(obj);

  try {
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) {
      // خطا شکل خودش را دارد؛ serializeError آن را می‌سازد و بعد همین‌جا
      // دوباره از فیلتر رد می‌شود.
      return walk({ name: value.name, message: value.message }, opts, depth + 1, seen);
    }
    if (value instanceof Map) {
      return walk(Object.fromEntries(value), opts, depth, seen);
    }
    if (value instanceof Set) {
      return walk([...value], opts, depth, seen);
    }
    if (Buffer.isBuffer(value)) return `«${value.length} بایت»`;

    if (Array.isArray(value)) {
      const capped = value.slice(0, opts.maxArray);
      const out: unknown[] = capped.map((item) => walk(item, opts, depth + 1, seen));
      if (value.length > opts.maxArray) {
        out.push(`«${value.length - opts.maxArray} عضو دیگر»`);
      }
      return out;
    }

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = shouldHide(key, opts.profile) ? REDACTED : walk(item, opts, depth + 1, seen);
    }
    return out;
  } finally {
    seen.delete(obj);
  }
}

/** همان redactDeep، ولی با خروجیِ تضمین‌شدهٔ «شیء ساده» — برای ستون jsonb. */
export function redactRecord(
  metadata: Record<string, unknown> | null | undefined,
  options: RedactOptions = {},
): Record<string, unknown> {
  if (!metadata) return {};
  const out = redactDeep(metadata, options);
  return out && typeof out === "object" && !Array.isArray(out)
    ? (out as Record<string, unknown>)
    : {};
}

// ---------------------------------------------------------------------------
// آدرس‌ها
// ---------------------------------------------------------------------------

/**
 * پارامترهای پرس‌وجویی که هرگز نباید در لاگ بنشینند.
 *
 * `/api/v1/auth/verify-email?token=…` و لینک بازنشانی رمز از همین راه وارد
 * لاگ می‌شدند — و یک لاگِ لو رفته با آن توکن یعنی تصاحب حساب.
 */
function isSensitiveParam(name: string): boolean {
  const n = normalizeKey(name);
  if (isSecretKey(n)) return true;
  return ["code", "key", "email", "mail", "phone", "q", "search"].includes(n);
}

/**
 * آدرس را برای لاگ امن می‌کند: مسیر می‌ماند، مقدارِ پارامترهای حساس پنهان
 * می‌شود، و fragment کلاً حذف می‌شود.
 *
 * ورودی می‌تواند آدرس کامل باشد یا فقط مسیر (`/a/b?c=d`).
 */
export function sanitizeUrl(input: string): string {
  if (!input) return "";

  let url: URL;
  let relative = false;
  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(input, "http://sarva.invalid");
      relative = true;
    } catch {
      return scrubText(input, 200);
    }
  }

  for (const name of [...url.searchParams.keys()]) {
    if (isSensitiveParam(name)) url.searchParams.set(name, REDACTED);
  }
  url.hash = "";

  const query = url.searchParams.toString();
  const path = `${url.pathname}${query ? `?${decodeURIComponent(query)}` : ""}`;

  return relative ? path : `${url.protocol}//${url.host}${path}`;
}

/**
 * مسیر را به «قالب مسیر» تبدیل می‌کند: `/panel/سروده/8f0c…` می‌شود
 * `/panel/سروده/:id`.
 *
 * برای گروه‌بندی در لاگ لازم است — بدون آن هر شناسه یک route جداگانه به نظر
 * می‌رسد و هیچ آماری قابل جمع‌بندی نیست. جای دیگری هم به کار می‌آید:
 * onRequestError گاهی routePath ندارد و فقط path واقعی را می‌دهد.
 */
export function sanitizeRoutePath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return ":id";
      }
      if (/^\d{3,}$/.test(segment)) return ":n";
      if (segment.length > 40) return ":slug";
      return segment;
    })
    .join("/");
}
