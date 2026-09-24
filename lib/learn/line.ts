/** سطرِ علامت‌خورده برای تمرین‌ها:
 *  `[…]` جوابِ درست (هستهٔ متمم؛ هر جفت کروشه یک جواب)،
 *  `{…}` حرف اضافه، `|…|` کلمه‌ای که سؤال دربارهٔ آن است.
 *  بقیهٔ کلمه‌ها ساده‌اند. فاصله‌ها همان فاصله‌های متن کتاب‌اند، پس
 *  `plainLine` دقیقاً همان سطرِ کتاب را برمی‌گرداند. */
export type Token = { text: string; target?: number; prep?: boolean; focus?: boolean };

export function parseLine(line: string): Token[] {
  const out: Token[] = [];
  let target = 0;
  for (const m of line.matchAll(/\[([^\]]+)\]|\{([^}]+)\}|\|([^|]+)\||(\S+)/g)) {
    if (m[1]) { const id = target++; for (const w of m[1].split(/\s+/)) out.push({ text: w, target: id }); }
    else if (m[2]) for (const w of m[2].split(/\s+/)) out.push({ text: w, prep: true });
    else if (m[3]) out.push({ text: m[3], focus: true });
    else out.push({ text: m[4] });
  }
  return out;
}

export const plainLine = (line: string) => parseLine(line).map(t => t.text).join(" ");
export const targetCount = (line: string) => new Set(parseLine(line).flatMap(t => t.target === undefined ? [] : [t.target])).size;
/** A word without the punctuation glued to it, for looking up notes. */
export const bare = (word: string) => word.replace(/[.،,؛:!؟?«»()]/g, "");
