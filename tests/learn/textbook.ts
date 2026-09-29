import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** یک سطرِ کتاب با نقش‌های دستوری و آرایه‌هایی که lib/doroos به کلمه‌هایش
 *  چسبانده. `words`ِ هر نقش ایندکسِ کلمه در سطر است (جداشده با فاصله). */
export type Role = { words: number[]; label: string };
export type Unit = { src: string; line: string; syntax: Role[]; devices: Role[]; literary: string[] };

const GRADES: Record<string, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
export const norm = (text: string) => text.normalize("NFC").replace(/[ً-ْ]/g, "").replace(/ۀ/g, "هٔ").trim();
/** نشانیِ سطری که از lib/doroos می‌آید با اسمِ پایه شروع می‌شود؛ بقیه
 *  (مثلاً «علوم و فنون ۲ · درس ششم») فقط برای نمایش‌اند. */
export const fromDoroos = (src?: string) => !!src && /^(دهم|یازدهم|دوازدهم) · /.test(src);

let cache: Promise<Unit[]> | undefined;
export function textbook(): Promise<Unit[]> {
  return cache ??= (async () => {
    const units: Unit[] = [];
    const dir = resolve("lib/doroos/content");
    for (const file of readdirSync(dir)) {
      const mod = await import(pathToFileURL(resolve(dir, file)).href);
      const lesson = mod.default ?? Object.values(mod).find((v: unknown) => (v as { kind?: string })?.kind);
      if (!lesson) continue;
      type Marks = (Role & { h: number })[];
      type Part = { lines: string[]; devices?: Marks; syntax?: Marks; literary?: string[] };
      const parts: Part[] = lesson.kind === "poem"
        ? lesson.beyts.map((b: { hemistichs: string[] } & Part) => ({ lines: b.hemistichs, devices: b.devices, syntax: b.syntax, literary: b.literary }))
        : lesson.passages;
      for (const part of parts) part.lines.forEach((line: string, h: number) => units.push({
        src: `${GRADES[lesson.grade]} · ${lesson.title}`, line,
        syntax: (part.syntax ?? []).filter(role => role.h === h),
        devices: (part.devices ?? []).filter(role => role.h === h),
        literary: part.literary ?? [],
      }));
    }
    return units;
  })();
}

export const labelsAt = (roles: Role[], i: number) => roles.filter(role => role.words.includes(i)).map(role => role.label).join(" + ");
