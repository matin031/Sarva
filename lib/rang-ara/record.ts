import { CONCEPTS, type ConceptId, type Level, type TokenId } from "./content";
import { canPaint, currentStep, isStepDone, judge, selections, type Found } from "./game";

/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — نمره‌دادنِ یک بیتِ بازی‌شده، برای ثبت در پنل.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ مرورگر فقط می‌گوید «کدام رنگ را روی کدام واژه زدم»، به همان ترتیب. درست
   و غلط را همین تابع با همان `judge`ِ خودِ بازی از نو می‌سازد، پس کسی که
   کنسول را باز کند نمی‌تواند «همه درست» ادعا کند؛ فقط می‌تواند جواب‌ها را
   بلد باشد.

   هر گام یک ردیف است با `mistakes`: چند ضربهٔ غلط به حسابِ همین آرایه
   نوشته شد. گام وقتی «درست» است که صفر باشد، یعنی بار اول پیدا شد.

   ⚠️ کدام گام تاوانِ ضربهٔ غلط را می‌دهد:
     • رنگِ غلط روی واژه‌ای که جوابِ گامِ دیگری است (`wrong-color`) ← همان
       گام. آرایهٔ آن واژه را نشناخته.
     • واژه‌ای که جوابِ هیچ گامی نیست (`wrong`) ← گامِ بازی که همین رنگ را
       می‌خواهد. آن آرایه را جای دیگری دیده. اگر چنین گامی نیست (رنگی از
       پالت که در این بیت نیست)، گامی که شخصیت همان لحظه می‌خواست.
     • لنگهٔ اشتباه برای جناس/سجعِ نیمه‌کاره (`wrong-pair`) ← همان جفت. */

export type Stroke = { concept: string; token: string };
export type StepResult = { step: number; concept: ConceptId; mistakes: number };

/** سقفِ ضربه‌های یک بیت. بیشتر از این یعنی درخواستِ ساختگی، نه بازی. */
export const MAX_STROKES = 120;

function isConcept(v: string): v is ConceptId {
  return Object.hasOwn(CONCEPTS, v);
}

/**
 * `null` یعنی این ضربه‌ها بیت را تمام نمی‌کنند یا با این بیت جور نیستند —
 * چیزی برای ثبت نیست.
 */
export function scoreVersePlay(level: Level, strokes: readonly Stroke[]): StepResult[] | null {
  if (!level.steps.length || strokes.length > MAX_STROKES) return null;

  const tokens = new Set<string>(level.tokens.map((t) => t.id));
  const found: Found[] = [];
  const mistakes = level.steps.map(() => 0);
  const open = () => level.steps.map((s, i) => ({ s, i })).filter(({ i }) => !isStepDone(level, found, i));

  for (const [n, stroke] of strokes.entries()) {
    if (!isConcept(stroke.concept) || !tokens.has(stroke.token)) return null;
    const token = stroke.token as TokenId;
    // بازی روی واژهٔ رنگ‌شده ضربه نمی‌پذیرد (مگر آرایهٔ دیگری هنوز در آن
    // مانده باشد)؛ پس این ضربه از بازی نیامده.
    if (!canPaint(level, found, token)) return null;
    if (currentStep(level, found) === -1) return null;

    const verdict = judge(level, found, stroke.concept, token);
    if (verdict.kind === "correct") {
      found.push({ step: verdict.step, tokens: verdict.tokens, strokeId: n });
      continue;
    }

    const rest = open();
    const owner =
      verdict.kind === "wrong-pair"
        ? rest.find(({ i }) => i === verdict.step)
        : verdict.kind === "wrong-color"
        ? rest.find(({ s }) => selections(s).some((sel) => sel.includes(token)))
        : rest.find(({ s }) => s.concept === stroke.concept);
    mistakes[(owner ?? rest[0]).i] += 1;
  }

  if (currentStep(level, found) !== -1) return null;
  return level.steps.map((s, i) => ({ step: i, concept: s.concept, mistakes: mistakes[i] }));
}
