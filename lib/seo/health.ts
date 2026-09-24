import "server-only";
import { LEGACY_ORIGIN, absoluteUrl, isNoindexEnvironment, siteOrigin } from "./site";
import { publicSitemapEntries } from "./urls";
import { readAiPolicy, readBrandProfile, readIndexNowKey, readSeoState } from "./settings";
import { maintenanceState } from "@/lib/site/maintenance";
import { GRADES } from "@/lib/doroos";

/**
 * «سلامتِ سئو» — آزمون‌هایی که مدیرِ غیرفنی با یک دکمه می‌بیند.
 *
 * هر آزمون یک جملهٔ ساده دارد که *چه* را می‌سنجد، و اگر رد شد، یک جملهٔ
 * «چه کنم». هدف این نیست که مدیر سئو یاد بگیرد؛ این است که بفهمد کِی باید به
 * برنامه‌نویس یا پشتیبانیِ هاست پیام بدهد و دقیقاً چه بگوید.
 *
 * دو دسته‌اند:
 *
 *   • **درونی** — از پیکربندی و دیتابیس خوانده می‌شوند و همیشه جواب می‌دهند.
 *   • **بیرونی** — سرور خودِ سایت را از راهِ اینترنت باز می‌کند، دقیقاً مثلِ
 *     گوگل. این‌ها چیزهایی را می‌بینند که کد نمی‌بیند (ریدایرکتِ www روی
 *     وب‌سرور، دامنهٔ قدیم، کشِ CDN). اگر هاست اجازهٔ اتصال به خودش را ندهد،
 *     «نامشخص» می‌شوند و نه «خراب».
 *
 * ⚠️ همهٔ نشانی‌هایی که باز می‌شوند از پیکربندی ساخته می‌شوند و هیچ‌کدام
 * ورودیِ کاربر نیست — پس این ابزار نمی‌تواند برای درخواست به جای دلخواه
 * (SSRF) به کار برود.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export type HealthCheck = {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  /** وقتی رد شد: دقیقاً چه کنم. */
  fix?: string;
};

const FETCH_TIMEOUT_MS = 8000;

async function get(url: string, redirect: RequestRedirect = "follow") {
  const started = Date.now();
  const res = await fetch(url, {
    redirect,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "SarvaSeoHealth/1.0 (+admin panel)" },
  });
  return { res, ms: Date.now() - started };
}

function unreachable(id: string, title: string, err: unknown): HealthCheck {
  return {
    id,
    title,
    status: "info",
    detail: `سرور نتوانست خودش را از بیرون باز کند (${(err as Error).name === "TimeoutError" ? "پاسخ نیامد" : (err as Error).message}). این معمولاً محدودیتِ هاست است، نه خرابیِ سایت.`,
    fix: "همین نشانی را خودتان در مرورگر باز کنید؛ اگر باز شد، جای نگرانی نیست.",
  };
}

/** رقمِ فارسی، بدونِ جداکنندهٔ هزارگان — تا کدِ ۴۰۳ یا عددِ میلی‌ثانیه ویرگول نگیرد. */
const faNum = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });

/* ─────────────────────────────── درونی ─────────────────────────────── */

export async function internalChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const origin = siteOrigin();
  const host = new URL(origin).hostname;

  checks.push(
    isNoindexEnvironment()
      ? {
          id: "noindex-env",
          title: "اجازهٔ ایندکس در گوگل",
          status: "fail",
          detail: "متغیرِ SEO_NOINDEX=true روی سرور روشن است: کلِ سایت به گوگل می‌گوید «مرا نشان نده».",
          fix: "فوراً به برنامه‌نویس یا پشتیبانِ هاست بگویید SEO_NOINDEX را از فایلِ .env سرور بردارد و برنامه را ری‌استارت کند.",
        }
      : {
          id: "noindex-env",
          title: "اجازهٔ ایندکس در گوگل",
          status: "pass",
          detail: "سایت به موتورهای جست‌وجو اجازه می‌دهد صفحه‌ها را نشان دهند.",
        },
  );

  checks.push(
    host === "sarvaedu.ir"
      ? { id: "origin", title: "نشانیِ اصلیِ سایت", status: "pass", detail: `همهٔ لینک‌های سئو به ${origin} اشاره می‌کنند.` }
      : {
          id: "origin",
          title: "نشانیِ اصلیِ سایت",
          status: "warn",
          detail: `لینک‌های سئو به ${origin} اشاره می‌کنند، نه sarvaedu.ir.`,
          fix: "اگر دامنه عوض نشده، NEXT_PUBLIC_SITE_URL باید https://sarvaedu.ir باشد و بستهٔ هاست دوباره ساخته شود (این مقدار هنگام ساخت داخلِ برنامه می‌نشیند).",
        },
  );

  try {
    const maintenance = await maintenanceState();
    checks.push(
      maintenance.on
        ? {
            id: "maintenance",
            title: "حالتِ «در حال بروزرسانی»",
            status: "warn",
            detail: "سایت برای بازدیدکننده‌ها و گوگل بسته است (کد ۵۰۳). چند ساعت ایرادی ندارد؛ چند روز یعنی افتادنِ صفحه‌ها از نتایج.",
            fix: "در «تنظیمات ← وضعیت سایت» خاموشش کنید، به‌محضِ اینکه کار تمام شد.",
          }
        : { id: "maintenance", title: "حالتِ «در حال بروزرسانی»", status: "pass", detail: "سایت باز است." },
    );
  } catch {
    /* خواندنِ وضعیت شکست خورد؛ آزمونِ بیرونی همین را از راهِ دیگری می‌بیند. */
  }

  const entries = await publicSitemapEntries();
  const ready = GRADES.reduce((n, g) => n + g.lessons.filter((l) => l.ready).length, 0);
  const total = GRADES.reduce((n, g) => n + g.lessons.length, 0);
  checks.push({
    id: "sitemap-internal",
    title: "نقشهٔ سایت (sitemap)",
    status: "pass",
    detail: `${faNum(entries.length)} صفحه به گوگل معرفی می‌شود، از جمله ${faNum(ready)} درسِ آماده از ${faNum(total)} درسِ سه کتاب.`,
  });

  const policy = await readAiPolicy();
  checks.push(
    policy === "none"
      ? {
          id: "ai-policy",
          title: "دسترسیِ هوش مصنوعی",
          status: "warn",
          detail: "همهٔ ربات‌های هوش مصنوعی بسته‌اند: سروا در پاسخ‌های ChatGPT، Perplexity و Claude پیشنهاد نمی‌شود.",
          fix: "در بخشِ «تنظیمات» همین صفحه، «همه مجازند» را انتخاب کنید.",
        }
      : {
          id: "ai-policy",
          title: "دسترسیِ هوش مصنوعی",
          status: "pass",
          detail:
            policy === "all"
              ? "ربات‌های ChatGPT، Claude، Gemini و Perplexity می‌توانند سروا را بخوانند و معرفی کنند."
              : "ربات‌های پاسخ‌گو مجازند؛ فقط آموزشِ مدل روی محتوای سروا بسته است.",
        },
  );

  const brand = await readBrandProfile();
  checks.push(
    brand.sameAs.length
      ? {
          id: "brand",
          title: "شناسنامهٔ برند",
          status: "pass",
          detail: `${faNum(brand.sameAs.length)} صفحهٔ رسمی به گوگل معرفی شده.`,
        }
      : {
          id: "brand",
          title: "شناسنامهٔ برند",
          status: "warn",
          detail: "هیچ صفحهٔ اجتماعیِ رسمی‌ای ثبت نشده؛ گوگل نمی‌داند کانال و پیجِ سروا کدام‌اند.",
          fix: "در بخشِ «تنظیمات» همین صفحه، نشانیِ کانالِ تلگرام، پیجِ اینستاگرام و… را بنویسید.",
        },
  );

  const [key, state] = await Promise.all([readIndexNowKey(), readSeoState()]);
  if (!key || !state.indexNow) {
    checks.push({
      id: "indexnow",
      title: "خبر به Bing و Yandex (IndexNow)",
      status: "info",
      detail: "هنوز هیچ‌وقت ارسال نشده.",
      fix: "در بخشِ «ابزارها» دکمهٔ «به موتورهای جست‌وجو خبر بده» را یک بار بزنید.",
    });
  } else {
    const days = Math.floor((Date.now() - new Date(state.indexNow.at).getTime()) / 86_400_000);
    checks.push({
      id: "indexnow",
      title: "خبر به Bing و Yandex (IndexNow)",
      status: state.indexNow.ok ? "pass" : "warn",
      detail: `آخرین ارسال ${days === 0 ? "امروز" : `${faNum(days)} روز پیش`}: ${state.indexNow.message}`,
      ...(state.indexNow.ok ? {} : { fix: "دوباره از بخشِ «ابزارها» ارسال کنید." }),
    });
  }

  return checks;
}

/* ─────────────────────────────── بیرونی ─────────────────────────────── */

async function checkRobots(): Promise<HealthCheck> {
  const title = "فایلِ robots.txt";
  try {
    const { res } = await get(absoluteUrl("/robots.txt"));
    const text = await res.text();
    if (res.status !== 200) {
      return { id: "robots", title, status: "fail", detail: `کد ${faNum(res.status)} برگشت.`, fix: "به برنامه‌نویس خبر بدهید." };
    }
    const blocksAll = /User-Agent:\s*\*\s*\n(?:(?!User-Agent)[\s\S])*?Disallow:\s*\/\s*$/im.test(text);
    if (blocksAll) {
      return {
        id: "robots",
        title,
        status: "fail",
        detail: "robots.txt همهٔ سایت را برای همهٔ موتورها بسته است.",
        fix: "SEO_NOINDEX روی سرور روشن است یا فایل دستی عوض شده؛ به برنامه‌نویس خبر بدهید.",
      };
    }
    if (!/Sitemap:\s*https?:\/\//i.test(text)) {
      return { id: "robots", title, status: "warn", detail: "نشانیِ sitemap در robots.txt نیست." };
    }
    return { id: "robots", title, status: "pass", detail: "در دسترس است و نشانیِ sitemap را دارد." };
  } catch (err) {
    return unreachable("robots", title, err);
  }
}

async function checkSitemap(expected: number): Promise<HealthCheck> {
  const title = "sitemap.xml روی سایتِ زنده";
  try {
    const { res } = await get(absoluteUrl("/sitemap.xml"));
    const text = await res.text();
    const count = (text.match(/<loc>/g) ?? []).length;
    if (res.status !== 200 || !count) {
      return { id: "sitemap", title, status: "fail", detail: `کد ${faNum(res.status)}، ${faNum(count)} نشانی.`, fix: "به برنامه‌نویس خبر بدهید." };
    }
    if (text.includes("localhost")) {
      return {
        id: "sitemap",
        title,
        status: "fail",
        detail: "sitemap به localhost اشاره می‌کند؛ گوگل هیچ صفحه‌ای را پیدا نمی‌کند.",
        fix: "بستهٔ هاست با NEXT_PUBLIC_SITE_URL=http://localhost ساخته شده. با https://sarvaedu.ir دوباره بسازید.",
      };
    }
    return {
      id: "sitemap",
      title,
      status: count >= expected ? "pass" : "info",
      detail:
        count >= expected
          ? `${faNum(count)} نشانی اعلام شده.`
          : `${faNum(count)} نشانی دیده شد و ${faNum(expected)} انتظار می‌رفت؛ نسخهٔ کش‌شده حداکثر یک ساعت بعد تازه می‌شود.`,
    };
  } catch (err) {
    return unreachable("sitemap", title, err);
  }
}

async function checkLlms(): Promise<HealthCheck> {
  const title = "فایلِ llms.txt (معرفیِ سروا به هوش مصنوعی)";
  try {
    const { res } = await get(absoluteUrl("/llms.txt"));
    const text = await res.text();
    return res.status === 200 && text.startsWith("# ")
      ? { id: "llms", title, status: "pass", detail: "در دسترس است." }
      : { id: "llms", title, status: "warn", detail: `کد ${faNum(res.status)}.`, fix: "به برنامه‌نویس خبر بدهید." };
  } catch (err) {
    return unreachable("llms", title, err);
  }
}

function pick(html: string, re: RegExp): string | null {
  return html.match(re)?.[1]?.trim() ?? null;
}

async function checkHome(): Promise<HealthCheck[]> {
  const out: HealthCheck[] = [];
  const title = "صفحهٔ خانه از دیدِ گوگل";
  try {
    const { res, ms } = await get(absoluteUrl("/"));
    const html = await res.text();
    const missing: string[] = [];
    if (!pick(html, /<title>([^<]+)<\/title>/i)) missing.push("عنوان");
    if (!pick(html, /<meta name="description" content="([^"]+)"/i)) missing.push("توضیح");
    if (!pick(html, /<link rel="canonical" href="([^"]+)"/i)) missing.push("canonical");
    if (!html.includes("application/ld+json")) missing.push("دادهٔ ساختاریافته");
    out.push(
      res.status === 200 && !missing.length
        ? { id: "home", title, status: "pass", detail: "عنوان، توضیح، canonical و دادهٔ ساختاریافته سرِ جایشان‌اند." }
        : {
            id: "home",
            title,
            status: "fail",
            detail: res.status !== 200 ? `کد ${faNum(res.status)} برگشت.` : `این‌ها پیدا نشد: ${missing.join("، ")}.`,
            fix: "به برنامه‌نویس خبر بدهید.",
          },
    );

    out.push({
      id: "speed",
      title: "زمانِ پاسخِ صفحهٔ خانه",
      status: ms < 1200 ? "pass" : ms < 3000 ? "warn" : "fail",
      detail: `${faNum(ms)} میلی‌ثانیه تا دریافتِ کاملِ HTML (از خودِ سرور).`,
      ...(ms >= 1200
        ? { fix: "در بخشِ «ابزارها» آزمونِ PageSpeed را اجرا کنید؛ اگر امتیازِ موبایل زیرِ ۵۰ بود، به برنامه‌نویس یا هاست خبر بدهید." }
        : {}),
    });

    const og = pick(html, /<meta property="og:image" content="([^"]+)"/i);
    if (!og) {
      out.push({
        id: "og-image",
        title: "تصویرِ پیش‌نمایش در تلگرام و واتساپ",
        status: "fail",
        detail: "صفحهٔ خانه تصویرِ اشتراک‌گذاری ندارد.",
        fix: "به برنامه‌نویس خبر بدهید.",
      });
    } else {
      try {
        const { res: img } = await get(og);
        if ([401, 403, 407, 429].includes(img.status)) {
          out.push(unreachable("og-image", "تصویرِ پیش‌نمایش در تلگرام و واتساپ", new Error(`کد ${faNum(img.status)}`)));
          return out;
        }
        out.push(
          img.status === 200 && (img.headers.get("content-type") ?? "").startsWith("image/")
            ? { id: "og-image", title: "تصویرِ پیش‌نمایش در تلگرام و واتساپ", status: "pass", detail: "تصویر در دسترس است." }
            : {
                id: "og-image",
                title: "تصویرِ پیش‌نمایش در تلگرام و واتساپ",
                status: "fail",
                detail: `تصویر باز نشد (کد ${faNum(img.status)}).`,
                fix: "به برنامه‌نویس خبر بدهید.",
              },
        );
      } catch (err) {
        out.push(unreachable("og-image", "تصویرِ پیش‌نمایش در تلگرام و واتساپ", err));
      }
    }
  } catch (err) {
    out.push(unreachable("home", title, err));
  }
  return out;
}

/** ریدایرکتِ یک نشانی به نشانیِ اصلی — برای www، http و دامنهٔ قدیم. */
async function checkRedirect(input: {
  id: string;
  title: string;
  from: string;
  fix: string;
  /** اگر DNSِ این نشانی اصلاً وجود ندارد، چه بگوییم. */
  whenMissing: HealthCheck["status"];
}): Promise<HealthCheck> {
  const origin = siteOrigin();
  try {
    const { res } = await get(input.from, "manual");
    if ([401, 403, 407, 429].includes(res.status)) {
      return {
        id: input.id,
        title: input.title,
        status: "info",
        detail: `درخواست با کدِ ${faNum(res.status)} رد شد (احتمالاً فایروال)؛ نمی‌شود فهمید ریدایرکت درست است یا نه.`,
        fix: `نشانیِ ${input.from} را در مرورگر باز کنید: باید خودبه‌خود به ${origin} برسید.`,
      };
    }
    const location = res.headers.get("location") ?? "";
    const target = location ? new URL(location, input.from).origin : "";
    if ([301, 308].includes(res.status) && target === origin) {
      return { id: input.id, title: input.title, status: "pass", detail: `با ریدایرکتِ دائمی (${faNum(res.status)}) به ${origin} می‌رود.` };
    }
    if ([302, 307].includes(res.status) && target === origin) {
      return {
        id: input.id,
        title: input.title,
        status: "warn",
        detail: `ریدایرکت «موقت» است (${faNum(res.status)}). گوگل اعتبارِ لینک‌ها را کامل منتقل نمی‌کند.`,
        fix: input.fix,
      };
    }
    return {
      id: input.id,
      title: input.title,
      status: "fail",
      detail: res.status >= 300 && res.status < 400 ? `به ${location} می‌رود، نه ${origin}.` : `ریدایرکت نمی‌شود (کد ${faNum(res.status)}): یک محتوا با دو نشانی.`,
      fix: input.fix,
    };
  } catch (err) {
    const msg = (err as Error & { cause?: { code?: string } }).cause?.code ?? "";
    if (msg === "ENOTFOUND") {
      return {
        id: input.id,
        title: input.title,
        status: input.whenMissing,
        detail: "این نشانی اصلاً روی اینترنت تعریف نشده (DNS ندارد).",
        ...(input.whenMissing === "pass" ? {} : { fix: input.fix }),
      };
    }
    return unreachable(input.id, input.title, err);
  }
}

/**
 * آیا سرور اصلاً می‌تواند سایت را از بیرون ببیند؟
 *
 * ⚠️ چرا این اول می‌آید: فایروالِ هاست (ModSecurity/Imunify در cPanel) یا یک
 * پراکسیِ خروجی گاهی درخواستی را که سرور به *خودش* می‌زند با ۴۰۳ رد می‌کند —
 * در حالی که همان صفحه برای گوگل و بازدیدکننده سالم است. بدونِ این پیش‌آزمون،
 * همهٔ آزمون‌های بعدی قرمز می‌شدند و مدیر فکر می‌کرد سایت خراب است؛ اولین
 * اجرای همین صفحه در محیطِ آزمایش دقیقاً همین را نشان داد.
 */
async function reachability(): Promise<{ ok: true } | { ok: false; why: string }> {
  try {
    const { res } = await get(absoluteUrl("/robots.txt"));
    await res.body?.cancel();
    if ([401, 403, 407, 429].includes(res.status) || res.status >= 500) {
      return { ok: false, why: `درخواستِ سرور به خودش با کدِ ${faNum(res.status)} رد شد` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      why: (err as Error).name === "TimeoutError" ? "پاسخی نیامد" : (err as Error).message,
    };
  }
}

export async function externalChecks(): Promise<HealthCheck[]> {
  const origin = new URL(siteOrigin());
  const expected = (await publicSitemapEntries()).length;
  const www = origin.hostname.startsWith("www.") ? origin.hostname.slice(4) : `www.${origin.hostname}`;

  const reach = await reachability();
  if (!reach.ok) {
    return [
      {
        id: "reach",
        title: "بررسیِ سایتِ زنده از روی سرور",
        status: "info",
        detail: `${reach.why}. این معمولاً فایروالِ هاست است که درخواستِ سرور به خودش را نمی‌پذیرد — نه خرابیِ سایت. گوگل و بازدیدکننده‌ها از این محدودیت اثر نمی‌گیرند.`,
        fix: `این‌ها را خودتان در مرورگر باز کنید و ببینید باز می‌شوند: ${absoluteUrl("/robots.txt")} و ${absoluteUrl("/sitemap.xml")} و ${absoluteUrl("/llms.txt")}. نشانیِ www و دامنهٔ قدیم هم باید خودبه‌خود به ${origin.origin} برسند.`,
      },
    ];
  }

  const results = await Promise.all([
    checkRobots(),
    checkSitemap(expected),
    checkLlms(),
    checkHome(),
    checkRedirect({
      id: "www",
      title: `${www} ← ${origin.hostname}`,
      from: `https://${www}/`,
      whenMissing: "warn",
      fix: "در cPanel ← Domains ← Redirects یک ریدایرکتِ «Permanent (301)» از www به نشانیِ بدونِ www بسازید (جزئیات: docs/domain-migration.md).",
    }),
    checkRedirect({
      id: "https",
      title: "http ← https",
      from: `http://${origin.hostname}/`,
      whenMissing: "fail",
      fix: "در cPanel بخشِ Domains گزینهٔ «Force HTTPS Redirect» را برای دامنه روشن کنید.",
    }),
    checkRedirect({
      id: "legacy",
      title: `دامنهٔ قدیم (${new URL(LEGACY_ORIGIN).hostname})`,
      from: `${LEGACY_ORIGIN}/`,
      whenMissing: "info",
      fix: "دامنهٔ قدیم باید با ریدایرکتِ ۳۰۱ به sarvaedu.ir برود و در Search Console ابزارِ «Change of Address» زده شود. تا وقتی دامنهٔ قدیم را دارید، تمدیدش کنید.",
    }),
  ]);

  return results.flat();
}
