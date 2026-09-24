/**
 * سیاستِ خزش — منطقِ خالصِ `robots.txt` و تنظیماتِ برند.
 *
 * ⚠️ بی‌import و بدونِ `server-only`، تا هم در `node --test` آزموده شود و هم
 * پنلِ مدیریت (کلاینت) بتواند فهرستِ ربات‌ها را نشان دهد.
 *
 * ── ربات‌های هوش مصنوعی: دو خانوادهٔ متفاوت ─────────────────────────────────
 *
 * «جلوی هوش مصنوعی را بگیر» دو معنی دارد که پیامدشان کاملاً فرق می‌کند:
 *
 *   ۱) ربات‌های *آموزش* (GPTBot، ClaudeBot، Google-Extended…) متن را برای
 *      آموزشِ نسلِ بعدیِ مدل برمی‌دارند. بستنشان یعنی «از محتوای من مدل
 *      نسازید» — ولی سروا در پاسخ‌ها همچنان می‌تواند بیاید.
 *
 *   ۲) ربات‌های *جست‌وجو و پاسخ* (OAI-SearchBot، ChatGPT-User، PerplexityBot،
 *      Claude-SearchBot…) همان لحظه صفحه را می‌خوانند تا به پرسشِ یک کاربر
 *      جواب دهند و **لینکِ سروا را کنارِ جواب بگذارند**. بستنِ این‌ها یعنی
 *      سروا از پاسخ‌های ChatGPT و Perplexity حذف می‌شود.
 *
 * برای سایتی که می‌خواهد در پاسخ‌های هوش مصنوعی دیده شود («جئو»)، خانوادهٔ
 * دوم هرگز نباید بسته شود؛ پیش‌فرض «همه مجاز» است.
 *
 * ⚠️ Googlebot اینجا نیست و هیچ‌وقت نباید باشد: «AI Overview» و «AI Mode»ِ
 * گوگل با همان Googlebotِ جست‌وجو کار می‌کنند و بستنش یعنی حذف از خودِ گوگل.
 * `Google-Extended` فقط استفاده در آموزش و پاسخ‌های Gemini را کنترل می‌کند.
 */

export type AiCrawlerPolicy = "all" | "search-only" | "none";

export type AiBot = { ua: string; owner: string; purpose: "training" | "answer" };

export const AI_BOTS: readonly AiBot[] = [
  // ── آموزشِ مدل ──
  { ua: "GPTBot", owner: "OpenAI (ChatGPT)", purpose: "training" },
  { ua: "ClaudeBot", owner: "Anthropic (Claude)", purpose: "training" },
  { ua: "Google-Extended", owner: "Google (Gemini)", purpose: "training" },
  { ua: "Applebot-Extended", owner: "Apple Intelligence", purpose: "training" },
  { ua: "meta-externalagent", owner: "Meta AI", purpose: "training" },
  { ua: "CCBot", owner: "Common Crawl", purpose: "training" },
  { ua: "Bytespider", owner: "ByteDance", purpose: "training" },
  { ua: "Amazonbot", owner: "Amazon", purpose: "training" },
  { ua: "cohere-training-data-crawler", owner: "Cohere", purpose: "training" },
  // ── جست‌وجو و پاسخ (لینک به سروا می‌دهند) ──
  { ua: "OAI-SearchBot", owner: "ChatGPT Search", purpose: "answer" },
  { ua: "ChatGPT-User", owner: "ChatGPT", purpose: "answer" },
  { ua: "Claude-SearchBot", owner: "Claude", purpose: "answer" },
  { ua: "Claude-User", owner: "Claude", purpose: "answer" },
  { ua: "PerplexityBot", owner: "Perplexity", purpose: "answer" },
  { ua: "Perplexity-User", owner: "Perplexity", purpose: "answer" },
  { ua: "DuckAssistBot", owner: "DuckDuckGo", purpose: "answer" },
  { ua: "MistralAI-User", owner: "Mistral (Le Chat)", purpose: "answer" },
];

export function parseAiPolicy(raw: string | null | undefined): AiCrawlerPolicy {
  return raw === "search-only" || raw === "none" ? raw : "all";
}

/** ربات‌هایی که با این سیاست بسته می‌شوند. */
export function blockedAiBots(policy: AiCrawlerPolicy): string[] {
  if (policy === "all") return [];
  if (policy === "search-only") return AI_BOTS.filter((b) => b.purpose === "training").map((b) => b.ua);
  return AI_BOTS.map((b) => b.ua);
}

/**
 * مسیرهایی که هیچ خزنده‌ای لازم ندارد بخواند.
 *
 * ⚠️ فقط صرفه‌جویی در خزش است، نه امنیت: `/panel` و `/admin` با سشن
 * محافظت می‌شوند.
 *
 * ⚠️ صفحه‌های `noindex` (`/quiz`، `/auth`…) اینجا *نیستند*: خزنده‌ای که
 * اجازهٔ خواندن ندارد، برچسبِ noindex را هم نمی‌بیند و آدرس می‌تواند بدونِ
 * محتوا در نتایج بماند.
 */
export const CRAWL_DISALLOW = ["/api/", "/admin", "/panel", "/result"] as const;

/**
 * قواعدِ robots.txt.
 *
 * ⚠️ نکتهٔ ظریف: هر خزنده فقط از *یک* گروه پیروی می‌کند — دقیق‌ترین گروهی
 * که نامش را دارد. پس اگر روزی گروهی برای یک رباتِ خاص با `Allow: /` اضافه
 * شود، آن ربات دیگر `Disallow`های گروهِ `*` را نمی‌بیند. به همین دلیل در
 * حالتِ «همه مجاز» هیچ گروهِ اختصاصی‌ای ساخته نمی‌شود.
 */
export function robotsRules(policy: AiCrawlerPolicy) {
  const rules: { userAgent: string | string[]; allow?: string; disallow: string | string[] }[] = [
    { userAgent: "*", allow: "/", disallow: [...CRAWL_DISALLOW] },
  ];
  const blocked = blockedAiBots(policy);
  if (blocked.length) rules.push({ userAgent: blocked, disallow: "/" });
  return rules;
}

/**
 * فهرستِ `sameAs` از متنِ پنل: هر خط (یا هر جداشده با فاصله/ویرگول) یک نشانی.
 *
 * فقط نشانیِ کاملِ http(s) پذیرفته می‌شود و تکراری‌ها حذف می‌شوند. ورودیِ
 * خراب نادیده گرفته می‌شود و صفحه را نمی‌شکند.
 */
export function parseSameAs(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[\s,،]+/)) {
    const candidate = part.trim();
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      const normalized = url.toString();
      if (!out.includes(normalized)) out.push(normalized);
    } catch {
      /* نشانیِ نامعتبر — رد می‌شود. */
    }
    if (out.length >= 20) break;
  }
  return out;
}
