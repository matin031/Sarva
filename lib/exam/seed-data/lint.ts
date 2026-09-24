import type { RichPassage } from "@/lib/exam/content-schemas";
import { hasCombiningUnderline } from "@/lib/exam/underline";
import type { SeedExam, SeedPart } from "./seed-types";

/**
 * Structural checks that `validateSeedExam` (Zod + score sums) cannot see:
 * ids that point nowhere, answer keys that the renderer can never produce,
 * and — the one students notice first — a question that says «واژهٔ
 * مشخص‌شده» while nothing on screen is underlined.
 *
 * `errors` make a paper ungradable or unanswerable; `warnings` are worth a
 * look but may be intentional.
 */
export type LintResult = { errors: string[]; warnings: string[] };

type Token = NonNullable<RichPassage["tokens"]>[number];

function passageTokens(p: RichPassage | undefined): Token[] {
  if (!p) return [];
  return [...(p.tokens ?? []), ...(p.lines ?? []).flat()];
}

const UNDERLINE_WORDS = /مشخّ?ص[\u200c\s]*(?:شده|شد)|های[\u200c\s]*مشخّ?ص|زیر[\u200c\s]*(?:آن[\u200c\s]*(?:ها)?[\u200c\s]*)?خط|خط[\u200c\s]*کشیده|زیرخط/;

/** Every string the part shows, paired with whether the renderer draws
 *  `{{…}}` markup in it. U+0332 is drawn everywhere text goes through
 *  MarkedText/HighlightedText. */
function visibleStrings(part: SeedPart): string[] {
  const c = part.content as Record<string, unknown>;
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") out.push(v);
  };
  for (const key of ["questionText", "statementText", "promptText", "firstMesra", "correctionPrompt"]) push(c[key]);
  for (const key of ["items", "columnA", "columnB", "nodes", "fields"]) {
    const arr = c[key];
    if (Array.isArray(arr))
      for (const it of arr) {
        const o = it as Record<string, unknown>;
        push(o.text);
        push(o.pairText);
        push(o.label);
      }
  }
  if (Array.isArray(c.lines)) for (const l of c.lines) push(l);
  if (Array.isArray(c.scrambledTokens)) for (const l of c.scrambledTokens) push(l);
  for (const t of [
    ...passageTokens(c.passage as RichPassage | undefined),
    ...passageTokens(c.stimulus as RichPassage | undefined),
  ]) {
    if ("value" in t) push(t.value);
  }
  for (const o of part.options ?? []) push(o.text);
  return out;
}

function hasUnderline(part: SeedPart): boolean {
  const c = part.content as Record<string, unknown>;
  const tokens = [
    ...passageTokens(c.passage as RichPassage | undefined),
    ...passageTokens(c.stimulus as RichPassage | undefined),
  ];
  if (tokens.some((t) => t.kind === "highlight" || t.kind === "select")) return true;
  return visibleStrings(part).some((s) => /\{\{[^}]+\}\}/.test(s) || hasCombiningUnderline(s));
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");

export function lintSeedExam(exam: SeedExam): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const numbers = new Set<number>();
  for (const section of exam.sections) {
    for (const q of section.questions) {
      if (numbers.has(q.number)) errors.push(`Q${q.number}: شمارهٔ سؤال تکراری است`);
      numbers.add(q.number);

      const labels = new Set<string>();
      for (const part of q.parts) {
        const L = `Q${q.number}${part.label ? `(${part.label})` : ""}`;
        const err = (m: string) => errors.push(`${L} [${part.type}]: ${m}`);
        const warn = (m: string) => warnings.push(`${L} [${part.type}]: ${m}`);

        if (part.label) {
          if (labels.has(part.label)) err(`برچسب «${part.label}» تکراری است`);
          labels.add(part.label);
        }
        if (!(part.score > 0)) err(`score باید بزرگ‌تر از صفر باشد (${part.score})`);
        if (q.parts.length > 1 && !part.label) warn("سؤال چندجزئی است ولی این جزء برچسب ندارد");

        // ---- text hygiene
        for (const s of visibleStrings(part)) {
          if (!s.trim() && part.type !== "fill-blank-term" && part.type !== "word-meaning-input")
            continue;
          if (/undefined|null|�|TODO|\?\?\?/.test(s)) err(`متن مشکوک: «${s.slice(0, 60)}»`);
          if (/[–-]\s*U\s*[–-]|\bU\b\s*[–-]/.test(s))
            warn(`نشانهٔ هجایی U/– در متن راست‌به‌چپ وارونه دیده می‌شود: «${s.slice(0, 60)}»`);
          if (/\{\{[^}]*$|^[^{]*\}\}/.test(s)) err(`{{ }} ناقص: «${s.slice(0, 60)}»`);
        }

        // ---- «مشخص‌شده» without anything underlined
        const c = part.content as Record<string, unknown>;
        const ownText = [
          c.questionText,
          c.statementText,
          c.promptText,
          part.content.type === "word-meaning-input" ? "مشخص" : undefined,
        ]
          .filter((x): x is string => typeof x === "string")
          .join(" ");
        const asksUnderline = UNDERLINE_WORDS.test(ownText) || (q.parts.length === 1 && UNDERLINE_WORDS.test(q.instruction ?? ""));
        const instructionUnderlined = hasCombiningUnderline(q.instruction ?? "");
        const questionHasAny = instructionUnderlined || q.parts.some(hasUnderline);
        if (asksUnderline && !hasUnderline(part) && !instructionUnderlined) {
          err("متنِ سؤال به واژهٔ «مشخص‌شده/زیرخط‌دار» اشاره می‌کند ولی هیچ واژه‌ای زیرخط ندارد");
        } else if (UNDERLINE_WORDS.test(q.instruction ?? "") && !questionHasAny) {
          err("دستورِ سؤال به واژهٔ «مشخص‌شده» اشاره می‌کند ولی هیچ جزئی زیرخط ندارد");
        } else if (
          UNDERLINE_WORDS.test(q.instruction ?? "") &&
          !hasUnderline(part) &&
          !instructionUnderlined &&
          ["word-meaning-input", "short-text-answer", "mcq-inline", "true-false"].includes(part.type)
        ) {
          warn("دستورِ سؤال به واژهٔ «مشخص‌شده» اشاره می‌کند ولی این جزء زیرخط ندارد");
        }

        // ---- per-type structure
        const ans = part.correctAnswer as Record<string, unknown>;
        switch (part.content.type) {
          case "word-meaning-input":
          case "fill-blank-term": {
            const blanks = passageTokens(part.content.passage).filter((t) => t.kind === "blank");
            if (blanks.length !== 1) err(`passage باید دقیقاً یک blank داشته باشد (${blanks.length})`);
            if (part.content.type === "word-meaning-input") {
              const ids = blanks.map((b) => (b as { blankId: string }).blankId);
              if (!sameSet(ids, Object.keys(ans))) err(`کلیدهای correctAnswer (${Object.keys(ans)}) با blankها (${ids}) نمی‌خواند`);
              const toks = passageTokens(part.content.passage);
              const bi = toks.findIndex((t) => t.kind === "blank");
              if (bi <= 0 || toks[bi - 1].kind !== "highlight")
                err("واژهٔ مورد پرسش دیده نمی‌شود — از highlightThenBlank استفاده کنید تا واژه زیرخط‌دار کنار کادر بماند");
            }
            break;
          }
          case "multi-part-inline-tagging": {
            const sels = passageTokens(part.content.passage).filter((t) => t.kind === "select") as Extract<Token, { kind: "select" }>[];
            const tags = (ans.tags ?? {}) as Record<string, string>;
            if (sels.length < 1) err("هیچ select ای در passage نیست");
            // a select without a tag is a deliberate distractor (weight 0), so
            // only tags pointing at a missing select are an error
            const selIds = new Set(sels.map((s) => s.blankId));
            for (const k of Object.keys(tags)) if (!selIds.has(k)) err(`tag «${k}» به select ناموجود اشاره می‌کند`);
            for (const s of sels) {
              if (tags[s.blankId] !== undefined && !s.options.includes(tags[s.blankId]))
                err(`پاسخِ ${s.blankId} («${tags[s.blankId]}») در گزینه‌های فهرست نیست`);
            }
            break;
          }
          case "diagram-builder": {
            const ids = new Set(part.content.nodes.map((n) => n.id));
            for (const e of (ans.edges ?? []) as { childId: string; parentId: string }[]) {
              if (!ids.has(e.childId) || !ids.has(e.parentId)) err(`یالِ ${e.childId}→${e.parentId} به گرهٔ ناموجود اشاره می‌کند`);
            }
            break;
          }
          case "two-answer-text": {
            const ids = part.content.fields.map((f) => f.id);
            if (!sameSet(ids, Object.keys(ans))) err(`کلیدهای پاسخ با fields نمی‌خواند`);
            break;
          }
          case "word-reorder-dnd": {
            const ordered = (ans.orderedTokens ?? []) as string[];
            if (!sameSet(ordered, part.content.scrambledTokens)) err("orderedTokens جایگشتِ scrambledTokens نیست");
            if (ordered.join("|") === part.content.scrambledTokens.join("|")) warn("واژه‌ها از اول مرتب‌اند");
            break;
          }
          case "matching-pairs-with-distractor": {
            const a = part.content.columnA.map((x) => x.id);
            const b = new Set(part.content.columnB.map((x) => x.id));
            if (part.content.columnB.length <= part.content.columnA.length) warn("ستون ب گزینهٔ اضافه ندارد");
            if (!sameSet(a, Object.keys(ans))) err("کلیدهای پاسخ با ستون الف نمی‌خواند");
            for (const v of Object.values(ans)) if (!b.has(v as string)) err(`پاسخِ «${v}» در ستون ب نیست`);
            break;
          }
          case "count-answer": {
            const v = ans.value as number;
            if (part.content.min !== undefined && v < part.content.min) err("پاسخ کمتر از min است");
            if (part.content.max !== undefined && v > part.content.max) err("پاسخ بیشتر از max است");
            break;
          }
          case "paired-list-error-correction": {
            const ids = part.content.items.map((x) => x.id);
            if (!sameSet(ids, Object.keys(ans))) err("کلیدهای پاسخ با items نمی‌خواند");
            for (const [k, v] of Object.entries(ans as Record<string, { isCorrect: boolean; correctedText?: string }>))
              if (!v.isCorrect && !v.correctedText) err(`${k}: نادرست است ولی correctedText ندارد`);
            break;
          }
          case "find-n-errors-in-list": {
            const ids = new Set(part.content.items.map((x) => x.id));
            const errIds = (ans.errorItemIds ?? []) as string[];
            if (errIds.length !== part.content.errorCount) err(`errorCount=${part.content.errorCount} ولی ${errIds.length} مورد غلط در کلید`);
            for (const id of errIds) if (!ids.has(id)) err(`errorItemId «${id}» ناموجود`);
            const corr = (ans.corrections ?? {}) as Record<string, string>;
            if (!sameSet(errIds, Object.keys(corr))) err("corrections با errorItemIds نمی‌خواند");
            break;
          }
          case "open-error-correction-in-passage": {
            const plain = passageTokens(part.content.passage)
              .map((t) => ("value" in t ? t.value : ""))
              .join("");
            if (!plain.includes(ans.wrongWord as string)) warn(`wrongWord «${ans.wrongWord}» در متن نیست`);
            break;
          }
          case "mcq-select-line-in-poem": {
            const i = ans.correctLineIndex as number;
            if (i < 0 || i >= part.content.lines.length) err(`correctLineIndex=${i} بیرون از بازه است`);
            break;
          }
          case "mcq-inline":
          case "mcq-plus-correction": {
            const n = (part.options ?? []).filter((o) => o.isCorrect).length;
            if (n !== 1) err(`باید دقیقاً یک گزینهٔ درست داشته باشد (${n})`);
            break;
          }
          case "mcq-multi-select": {
            const n = (part.options ?? []).filter((o) => o.isCorrect).length;
            if (n < part.content.minSelect || n > part.content.maxSelect)
              err(`${n} گزینهٔ درست، ولی min/max انتخاب ${part.content.minSelect}/${part.content.maxSelect}`);
            break;
          }
          case "short-text-answer": {
            if (part.gradingMode === "exact_match" && part.content.inputVariant === "textarea")
              warn("پاسخِ تشریحی با exact_match تقریباً هیچ‌وقت درست تشخیص داده نمی‌شود");
            break;
          }
        }

        if (part.options) {
          const texts = part.options.map((o) => o.text.trim());
          if (new Set(texts).size !== texts.length) err("گزینهٔ تکراری");
        }
      }
    }
  }
  return { errors, warnings };
}
