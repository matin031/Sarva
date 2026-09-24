import type { Grade, Lesson } from "@/lib/doroos/types";
import { lessonOrdinal } from "./catalog";
import { absoluteUrl } from "./site";
import { ORGANIZATION_ID } from "./entity";

/**
 * عنوان، توضیح و دادهٔ ساختاریافتهٔ یک درس.
 *
 * ⚠️ عمداً بدونِ `server-only` و بدونِ import از `lib/doroos` (که قفلِ سرور
 * دارد): منطقِ خالص است و در `node --test` آزموده می‌شود.
 *
 * ── عنوان ─────────────────────────────────────────────────────────────────
 *
 * پیش از این: «نیکی — درس 1 فارسی ۲ پایهٔ یازدهم». سه ایراد داشت:
 *
 *   • رقمِ لاتین («درس 1») وسطِ عنوانِ فارسی، چون شماره بدونِ `faNum` چاپ
 *     می‌شد.
 *   • واژه‌ای که دانش‌آموز واقعاً جست‌وجو می‌کند — «معنی» — اصلاً نبود.
 *   • «درس ۱» و نه «درس اول»؛ شکلِ رایجِ جست‌وجو عددِ ترتیبی است.
 *
 * حالا: «معنی درس اول فارسی یازدهم: نیکی — شرح کامل و آرایه‌ها».
 *
 * ── توضیح ─────────────────────────────────────────────────────────────────
 *
 * ⚠️ فقط چیزی گفته می‌شود که صفحه واقعاً دارد. «سؤال امتحانی» و «قرابت
 * معنایی» را همهٔ درس‌ها ندارند؛ اگر توضیحِ همه یکی بود، نیمی از صفحه‌ها
 * در نتیجهٔ جست‌وجو چیزی وعده می‌دادند که پشتش نبود.
 */

type LessonFacts = {
  kind: Lesson["kind"];
  /** همهٔ واحدها بیت‌اند — درسِ «نثر»ی که در واقع سراسر شعر است (مثلِ «نیکی» از بوستان). */
  allVerse: boolean;
  title: string;
  /** شاعر یا نویسندهٔ متنِ درس. */
  creator?: string;
  hasExam: boolean;
  hasAffinity: boolean;
  units: number;
};

export function lessonFacts(lesson: Lesson): LessonFacts {
  const units = lesson.kind === "poem" ? lesson.beyts : lesson.passages;
  return {
    kind: lesson.kind,
    allVerse: lesson.kind === "poem" || lesson.passages.every((p) => p.form === "verse"),
    title: lesson.title,
    creator: lesson.kind === "poem" ? lesson.poet : lesson.author,
    hasExam: units.some((u) => Boolean(u.exam)),
    hasAffinity: units.some((u) => Boolean(u.affinity?.length)),
    units: units.length,
  };
}

export function lessonTitle(grade: Pick<Grade, "label">, number: number, facts: LessonFacts): string {
  const how = facts.allVerse ? "شرح بیت‌به‌بیت و آرایه‌ها" : "شرح کامل و آرایه‌ها";
  return `معنی درس ${lessonOrdinal(number)} فارسی ${grade.label}: ${facts.title} — ${how}`;
}

export function lessonDescription(
  grade: Pick<Grade, "label" | "book">,
  number: number,
  facts: LessonFacts,
): string {
  const by = facts.creator ? ` از ${facts.creator}` : "";
  const extras = [
    facts.hasExam ? "سؤال امتحانی" : null,
    facts.hasAffinity ? "قرابت معنایی" : null,
  ].filter(Boolean);
  const tail = extras.length ? `، همراه با ${extras.join(" و ")}` : "";
  const how = facts.allVerse ? "بیت‌به‌بیت" : "بند‌به‌بند";
  return `معنی روان و شرحِ ${how} درس ${lessonOrdinal(number)} ${grade.book} (فارسی ${grade.label})، «${facts.title}»${by}: قلمرو زبانی، ادبی و فکری، آرایه‌ها و مفهوم${tail}.`;
}

/**
 * `LearningResource` برای یک درس.
 *
 * ⚠️ `author` نیست، و این عمدی است: نویسندهٔ *شرح* سروا است (`publisher`) و
 * شاعرِ متن نویسندهٔ *موضوعِ* درس. پس شاعر زیرِ `about` می‌نشیند — «این درس
 * دربارهٔ فلان اثرِ سعدی است» — و نه به‌عنوانِ نویسندهٔ همین صفحه، که ادعای
 * نادرستی می‌شد.
 *
 * ⚠️ `isAccessibleForFree` هم نیست: بخشی از تحلیل (نقش‌ها و آرایه‌های
 * نموداری) پشتِ سروا پلاس است و در HTML نمی‌آید. نه «رایگان» درست است و نه
 * «پولی»، پس چیزی ادعا نمی‌شود.
 */
export function lessonJsonLd(
  grade: Pick<Grade, "key" | "label" | "book">,
  number: number,
  facts: LessonFacts,
  description: string,
) {
  const path = `/doroos/${grade.key}/${number}`;
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#lesson`,
    name: `معنی و شرح درس ${lessonOrdinal(number)} فارسی ${grade.label}: ${facts.title}`,
    description,
    url,
    inLanguage: "fa-IR",
    learningResourceType: "درسنامه",
    educationalLevel: `پایهٔ ${grade.label} — دورهٔ دوم متوسطه`,
    teaches: ["معنی و مفهوم", "قلمرو زبانی", "قلمرو ادبی (آرایه‌ها)", "قلمرو فکری"],
    /* ⚠️ فقط ارجاع با `@id`: گرهٔ کاملِ `Course` (با توضیح و ارائه‌دهنده)
       روی صفحهٔ پایه است. گرهٔ ناقصِ `Course` اینجا در آزمونِ گوگل «فیلدِ
       الزامی ندارد» می‌گرفت. */
    isPartOf: { "@id": `${absoluteUrl(`/doroos/${grade.key}`)}#course` },
    about: {
      "@type": "CreativeWork",
      name: facts.title,
      ...(facts.creator ? { author: { "@type": "Person", name: facts.creator } } : {}),
    },
    publisher: { "@id": ORGANIZATION_ID() },
  };
}

/** `Course` برای صفحهٔ یک پایه، با فهرستِ درس‌های منتشرشده. */
export function gradeCourseJsonLd(
  grade: Pick<Grade, "key" | "label" | "book">,
  lessons: readonly { number: number; title?: string }[],
  description: string,
) {
  const url = absoluteUrl(`/doroos/${grade.key}`);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${url}#course`,
    name: `درسنامهٔ ${grade.book} (فارسی ${grade.label})`,
    description,
    url,
    inLanguage: "fa-IR",
    educationalLevel: `پایهٔ ${grade.label} — دورهٔ دوم متوسطه`,
    provider: { "@id": ORGANIZATION_ID() },
    hasPart: lessons.map((l) => ({
      "@type": "LearningResource",
      "@id": `${absoluteUrl(`/doroos/${grade.key}/${l.number}`)}#lesson`,
      name: `درس ${lessonOrdinal(l.number)}${l.title ? `: ${l.title}` : ""}`,
      url: absoluteUrl(`/doroos/${grade.key}/${l.number}`),
    })),
  };
}
