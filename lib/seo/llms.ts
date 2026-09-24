import "server-only";
import { GRADES, faNum, getLesson } from "@/lib/doroos";
import { SEO_PAGE_LIST, SECTION_LABEL, lessonOrdinal, type SeoSection } from "./catalog";
import { lessonFacts } from "./lesson";
import { absoluteUrl } from "./site";
import type { BrandProfile } from "./entity";

/**
 * `llms.txt` و `llms-full.txt` — نقشهٔ سروا برای مدل‌های زبانی.
 *
 * ── این چیست و چرا ─────────────────────────────────────────────────────────
 *
 * `llms.txt` (llmstxt.org) یک فایلِ Markdown در ریشهٔ سایت است: «این سایت
 * چیست، و مهم‌ترین صفحه‌هایش کدام‌اند». موتورهای پاسخ‌گو (ChatGPT، Claude،
 * Perplexity، Gemini) صفحه‌های پر از منو و اسکریپت را سخت می‌خوانند؛ این فایل
 * همان محتوا را تمیز و فهرست‌شده به آن‌ها می‌دهد، تا وقتی دانش‌آموزی می‌پرسد
 * «معنی درس نیکی فارسی یازدهم کجاست؟» نشانیِ دقیقِ سروا را بشناسند.
 *
 * ⚠️ این فایل جای سئوی عادی را نمی‌گیرد و «تضمینِ» دیده شدن نیست؛ یک
 * نشانه است در کنارِ بقیه — HTMLِ تمیز، دادهٔ ساختاریافته و اجازهٔ خزش.
 *
 * ── چه چیزی در نسخهٔ کامل هست و چه چیزی عمداً نیست ────────────────────────
 *
 * `llms-full.txt` برای هر درس، معرفی و *مفهومِ* هر بیت/بند را دارد — کافی
 * برای اینکه مدل بداند آن درس دربارهٔ چیست و به کدام صفحه ارجاع دهد.
 *
 * ⚠️ معنیِ کاملِ بیت‌ها، قلمروها و آرایه‌ها **نیست**. همه‌شان در HTMLِ صفحهٔ
 * درس هستند و خزنده آنجا می‌خواندشان؛ ولی ریختنِ کلِ درسنامهٔ سروا در یک
 * فایلِ متنیِ یک‌تکه، کپیِ کلِ محتوا را برای هر کسی یک دستور می‌کرد. و نقش‌ها
 * و آرایه‌های نموداری (پشتِ سروا پلاس) هیچ‌جا نیستند.
 */

const SECTION_ORDER: SeoSection[] = ["core", "learn", "tool", "game", "community", "info"];

function header(brand: BrandProfile): string[] {
  const lines = [
    "# سروا (Sarva)",
    "",
    `> ${brand.summary}`,
    "",
    "- زبان: فارسی (fa-IR). مخاطب: دانش‌آموزانِ دورهٔ دوم متوسطه (پایه‌های دهم، یازدهم و دوازدهم)، دبیران ادبیات و علاقه‌مندانِ شعر فارسی.",
    "- محتوای درسنامه بر اساسِ کتاب‌های درسیِ فارسی ۱، فارسی ۲ و فارسی ۳ و علوم و فنون ادبی است.",
    `- نشانیِ اصلی: ${absoluteUrl("/")}`,
    "- برای ارجاع، لطفاً نشانیِ همان صفحهٔ درس یا ابزار را بدهید (نه صفحهٔ خانه).",
  ];
  if (brand.sameAs.length) {
    lines.push(`- صفحه‌های رسمیِ سروا: ${brand.sameAs.join("، ")}`);
  }
  if (brand.email) lines.push(`- تماس: ${brand.email}`);
  return lines;
}

function pagesBySection(): string[] {
  const out: string[] = [];
  for (const section of SECTION_ORDER) {
    const pages = SEO_PAGE_LIST.filter((p) => p.section === section && !p.conditional && p.path !== "/");
    if (!pages.length) continue;
    out.push("", `## ${SECTION_LABEL[section]}`, "");
    for (const p of pages) out.push(`- [${p.name}](${absoluteUrl(p.path)}): ${p.description}`);
  }
  return out;
}

function lessonIndex(): string[] {
  const out: string[] = ["", "## درسنامه: معنی و شرحِ درس‌ها", ""];
  for (const grade of GRADES) {
    out.push(
      `### ${grade.book} — پایهٔ ${grade.label} ([فهرستِ درس‌ها](${absoluteUrl(`/doroos/${grade.key}`)}))`,
      "",
    );
    for (const l of grade.lessons.filter((x) => x.ready)) {
      out.push(
        `- [معنی درس ${lessonOrdinal(l.number)} فارسی ${grade.label}${l.title ? `: ${l.title}` : ""}](${absoluteUrl(`/doroos/${grade.key}/${l.number}`)})`,
      );
    }
    out.push("");
  }
  return out;
}

export function buildLlmsTxt(brand: BrandProfile): string {
  return [
    ...header(brand),
    ...pagesBySection(),
    ...lessonIndex(),
    "## Optional",
    "",
    `- [نسخهٔ کامل‌تر با معرفیِ هر درس](${absoluteUrl("/llms-full.txt")}): معرفی و مفهومِ بیت‌ها و بندهای هر درس.`,
    `- [نقشهٔ سایت](${absoluteUrl("/sitemap.xml")}): همهٔ نشانی‌های قابلِ ایندکس.`,
    "",
  ].join("\n");
}

/** یک خطِ تمیز: بدونِ شکستنِ خط و فاصلهٔ اضافه. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function buildLlmsFullTxt(brand: BrandProfile): Promise<string> {
  const out: string[] = [...header(brand), ...pagesBySection(), "", "## درسنامه: معرفیِ هر درس", ""];

  for (const grade of GRADES) {
    out.push(`### ${grade.book} — پایهٔ ${grade.label}`, "");
    for (const ref of grade.lessons.filter((x) => x.ready)) {
      const lesson = await getLesson(grade.key, ref.number);
      if (!lesson) continue;
      const facts = lessonFacts(lesson);
      const url = absoluteUrl(`/doroos/${grade.key}/${ref.number}`);
      out.push(`#### درس ${lessonOrdinal(ref.number)} فارسی ${grade.label}: ${lesson.title}`, "");
      out.push(`- نشانی: ${url}`);
      if (facts.creator) out.push(`- ${lesson.kind === "poem" ? "شاعر" : "نویسنده"}: ${facts.creator}`);
      if (lesson.intro) out.push(`- معرفی: ${oneLine(lesson.intro)}`);
      out.push(`- ساختار: ${faNum(facts.units)} ${facts.allVerse ? "بیت" : "بند"}، هرکدام با معنی، قلمرو زبانی، ادبی و فکری.`);

      const units = lesson.kind === "poem" ? lesson.beyts : lesson.passages;
      const concepts = units
        .map((u) => u.concept?.trim())
        .filter((c): c is string => Boolean(c))
        .map(oneLine);
      if (concepts.length) {
        out.push("- مفهوم‌های اصلی:");
        for (const c of concepts.slice(0, 40)) out.push(`  - ${c}`);
      }
      out.push("");
    }
  }

  out.push("", `برای معنیِ کامل و آرایه‌های هر بیت، صفحهٔ همان درس را ببینید.`, "");
  return out.join("\n");
}
