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

/* ───────── ادعاهای آرایه‌ای ───────── */

import type { Beat } from "../../lib/learn/types";
import { parseLine, plainLine } from "../../lib/learn/line";

type Claim = { where: string; line: string; src: string; kind: "target" | "yes" | "no" | "bin" | "exists"; bin?: string; every?: boolean };

/** هر سطرِ کتاب در درس، با ادعایی که درس دربارهٔ کلمه‌های نشان‌دارش دارد. */
function claims(beats: Beat[]): Claim[] {
  const out: Claim[] = [];
  const add = (where: string, line: string, src: string | undefined, kind: Claim["kind"], extra: Partial<Claim> = {}) => {
    if (fromDoroos(src)) out.push({ where, line, src: src!, kind, ...extra });
  };
  beats.forEach((beat, i) => {
    const at = `beat ${i} ${beat.kind}`;
    if (beat.kind === "tap") add(at, beat.item.line, beat.item.src, "target", { every: true });
    if (beat.kind === "round") for (const item of beat.items) add(at, item.line, item.src, "target", { every: true });
    if (beat.kind === "judge") for (const item of beat.items) add(at, item.line, item.src, item.yes ? "yes" : "no");
    if (beat.kind === "morph") add(at, beat.line, beat.src, "yes");
    if (beat.kind === "sort") for (const item of beat.items) add(at, item.line, item.src, "bin", { bin: beat.bins[item.bin].label });
    // هر مصراعِ یک سطرِ دومصراعی جدا در کتاب است.
    if (beat.kind === "pillars") for (const item of beat.items) for (const half of item.line.split(" / ")) add(at, half, item.src, "target");
    if (beat.kind === "choice" && beat.stimulus) add(at, beat.stimulus, beat.src, "exists");
    if (beat.kind === "timeline") for (const item of beat.items) add(at, item.line, item.src, "exists");
  });
  return out;
}

/** سطرهای کتابِ یک درسِ آرایه‌ای را با `devices`ِ lib/doroos می‌سنجد.
 *  `yes` یعنی «این آرایه»؛ `bins` برای هر اسمِ سبد می‌گوید برچسبِ کتاب چه
 *  باید باشد. خروجی فهرستِ خطاهاست. */
export async function checkDevices(beats: Beat[], yes: RegExp, bins: Record<string, (labels: string) => boolean> = {}) {
  const units = await textbook();
  const list = claims(beats);
  const failures: string[] = [];
  for (const { where, line, src, kind, bin, every } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    if (!unit) throw new Error(`${where}: «${plain}» is not a line in lib/doroos`);
    if (norm(src) !== norm(unit.src)) throw new Error(`${where}: «${plain}» is from «${unit.src}», not «${src}»`);
    if (kind === "exists") continue;
    const tokens = parseLine(line);
    const marked = tokens.flatMap((token, i) => token.target !== undefined || token.focus ? [i] : []);
    if (!marked.length) throw new Error(`${where}: nothing is marked in «${plain}»`);
    for (const i of marked) {
      const labels = labelsAt(unit.devices, i);
      const word = tokens[i].text;
      if (kind === "target" || kind === "yes") { if (!yes.test(labels)) throw new Error(`${where}: the textbook does not tag «${word}» as ${yes} (it says «${labels}»)`); }
      else if (kind === "no") {
        if (yes.test(labels)) throw new Error(`${where}: the textbook does tag «${word}» as ${yes}`);
        if (!labels && !labelsAt(unit.syntax, i)) throw new Error(`${where}: the textbook says nothing about «${word}»`);
      } else {
        const rule = bins[bin!];
        if (!rule) throw new Error(`${where}: no rule for bin «${bin}»`);
        if (!rule(labels)) throw new Error(`${where}: «${word}» is in «${bin}», but the textbook says «${labels}»`);
      }
    }
    // در سطرِ تپ‌کردنی، هر جای این آرایه که کتاب می‌بیند باید جواب باشد.
    if (every) for (const role of unit.devices) if (yes.test(role.label) && !role.words.some(i => tokens[i]?.target !== undefined))
      throw new Error(`${where}: textbook «${role.words.map(i => tokens[i]?.text).join(" ")}» (${role.label}) is not an answer`);
  } catch (error) { failures.push((error as Error).message); } }
  return { failures, count: list.length };
}
