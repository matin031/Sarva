import type { GrammarRoleDefinition } from "./types";

/**
 * فهرستِ نقش‌های «مدار دستور».
 *
 * تا امروز نقش‌ها فقط داخلِ خودِ سؤال‌ها زندگی می‌کردند: هر رکوردِ بستهٔ
 * محتوایی `roleDefinitions` خودش را داشت و کلیدها با کپی‌کردن از رکوردِ کناری
 * ثابت می‌ماندند. برای فایلِ JSON که یک نفر می‌نویسد کافی بود؛ برای پنلی که
 * مدیر در آن سؤال می‌سازد نه — آنجا باید فهرستی برای *انتخاب* وجود داشته
 * باشد، وگرنه یک غلطِ تایپی در کلید یک نقشِ تازه می‌سازد که هیچ‌جا با بقیه
 * جور نمی‌شود.
 *
 * ⚠️ کلیدها قراردادِ داده‌اند: ۵۵۵ رکوردِ موجود در `seed-data/` با همین‌ها
 * نوشته شده‌اند. برچسبِ فارسی هر وقت بخواهیم عوض می‌شود (منطق هیچ‌جا با آن
 * مقایسه نمی‌کند)، ولی کلید هرگز.
 */
export interface GrammarRoleCatalogEntry extends GrammarRoleDefinition {
  hint: string;
}

export const GRAMMAR_ROLE_CATALOG: GrammarRoleCatalogEntry[] = [
  { key: "subject", label: "نهاد", hint: "انجام‌دهندهٔ فعل یا کسی که دربارهٔ او خبر می‌دهیم." },
  { key: "object", label: "مفعول", hint: "آنچه کارِ فعل بر آن واقع می‌شود؛ معمولاً با «را»." },
  { key: "verb", label: "فعل", hint: "کار یا حالت، با زمان و شخص." },
  { key: "predicate", label: "مسند", hint: "خبری که با فعلِ ربطی به نهاد داده می‌شود." },
  { key: "complement", label: "متمم", hint: "اسمی که بعد از حرف اضافه می‌آید و معنی را کامل می‌کند." },
  { key: "adverb", label: "قید", hint: "زمان، مکان یا چگونگیِ انجامِ کار." },
  { key: "adjective", label: "صفت", hint: "ویژگیِ اسم." },
  { key: "possessive", label: "مضاف‌الیه", hint: "اسمی که با کسرهٔ اضافه به اسمِ پیش از خود می‌چسبد." },
  { key: "conjunct", label: "معطوف", hint: "کلمه‌ای که با حرف عطف به کلمهٔ پیشین می‌پیوندد و نقشِ آن را می‌گیرد." },
  { key: "appositive", label: "بدل", hint: "اسمی که همان مرجعِ اسمِ پیشین را با نامی دیگر می‌آورد." },
  { key: "vocative", label: "منادا", hint: "کسی یا چیزی که مورد خطاب قرار گرفته است." },
  { key: "absolute_object", label: "مفعول مطلق", hint: "مصدری که برای تأکید یا بیانِ نوعِ فعل می‌آید." },
  { key: "interjection", label: "شبه‌جمله", hint: "کلمه‌ای که به‌تنهایی معنیِ یک جمله را می‌رساند." },
];

const BY_KEY = new Map(GRAMMAR_ROLE_CATALOG.map((r) => [r.key, r]));

export function isGrammarRoleKey(value: unknown): value is string {
  return typeof value === "string" && BY_KEY.has(value);
}

export function grammarRoleLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

/** تعریفِ نقش‌ها برای ذخیره در payload — فقط کلید و برچسب.
 *
 *  `hint` عمداً نمی‌رود: در payload کپی می‌شد و اصلاحِ یک توضیح به بازنویسیِ
 *  همهٔ سؤال‌هایی که آن نقش را دارند نیاز داشت. */
export function roleDefinitionsFor(keys: readonly string[]): GrammarRoleDefinition[] {
  const seen = new Set<string>();
  const out: GrammarRoleDefinition[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = BY_KEY.get(key);
    out.push(entry ? { key: entry.key, label: entry.label } : { key, label: key });
  }
  return out;
}
