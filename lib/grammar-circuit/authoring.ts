import { roleDefinitionsFor } from "./roles";
import type {
  GrammarCircuitQuestion,
  GrammarCircuitQuestionType,
  GrammarCircuitToken,
  GrammarRolePiece,
} from "./types";

/**
 * ساختنِ یک پرسشِ «مدار دستور» از چیزی که مدیر واقعاً تایپ می‌کند.
 *
 * مدلِ سؤال (types.ts) عمداً صریح است: توکن‌ها از پیش تکه شده‌اند، جداکنندهٔ
 * هر توکن در داده است، و نقش‌ها و قطعه‌ها جدا تعریف می‌شوند. برای فایلِ JSON
 * که یک نویسندهٔ محتوا با دست می‌نویسد این درست است — ولی هیچ مدیری قرار نیست
 * `roleDefinitions` و `pieces` و `separatorAfter` را دستی بنویسد.
 *
 * این فایل همان فاصله را پر می‌کند: یک جمله به‌علاوهٔ «این واژه چه نقشی
 * دارد؟» برای هر واژه، و بقیه از رویش ساخته می‌شود.
 *
 * عمداً بدونِ `server-only` است: پنل باید *همین‌جا در مرورگر* و پیش از ذخیره،
 * نتیجهٔ اعتبارسنجی را نشان بدهد، و سرور باید دوباره همان را بسازد و بسنجد.
 * دو پیاده‌سازی یعنی دو حقیقتِ موازی.
 */

/** یک واژه در ویرایشگر: متن، جداکنندهٔ بعدش، و نقش‌هایی که برایش پذیرفته‌ایم.
 *  `acceptedRoleKeys` خالی یعنی این واژه نمایش داده می‌شود ولی سوکت ندارد. */
export interface AuthoredToken {
  id: string;
  text: string;
  separatorAfter: string;
  acceptedRoleKeys: string[];
}

export interface AuthoredQuestion {
  type: GrammarCircuitQuestionType;
  tokens: AuthoredToken[];
  /** قطعه‌های فریب: نقش‌هایی که در سینی هستند ولی هیچ سوکتی نمی‌خواهدشان. */
  distractorRoleKeys: string[];
  /** ترتیبِ معناییِ مدار، اگر از ترتیبِ جمله متفاوت باشد. */
  circuitOrder?: string[];
}

// نقطه‌گذاریِ چسبیده به آخرِ واژه. جدا می‌شود چون «بارید.» و «بارید» باید یک
// واژه باشند — وگرنه نقشِ فعل به واژه‌ای با نقطه نسبت داده می‌شود.
const TRAILING_PUNCTUATION = /[.،؛:!؟?»)\]]+$/u;
const LEADING_PUNCTUATION = /^[«([]+/u;

/**
 * تکه‌کردنِ یک جملهٔ خام به توکن‌ها، با نگه داشتنِ دقیقِ جداکننده‌ها.
 *
 * ⚠️ فقط روی فاصلهٔ واقعی تکه می‌شود. نیم‌فاصله (U+200C) در `\s` جاوااسکریپت
 * نیست، پس «مضاف‌الیه» یک توکن می‌ماند — که همان چیزی است که types.ts دربارهٔ
 * حدس‌نزدنِ نیم‌فاصله در زمانِ اجرا می‌گوید.
 */
export function tokenizeSentence(text: string): AuthoredToken[] {
  const out: AuthoredToken[] = [];
  // نقطه‌گذاری‌ای که هنوز توکنی برای چسبیدن به آن ندارد (ابتدای جمله).
  let pendingLeading = "";
  // هر تکهٔ غیرفاصله به‌همراه فاصله‌ای که بعدش آمده؛ فاصلهٔ ابتدای متن نادیده.
  const pattern = /(\S+)(\s*)/gu;

  for (const match of text.matchAll(pattern)) {
    const [, chunk, whitespace] = match;

    const leading = LEADING_PUNCTUATION.exec(chunk)?.[0] ?? "";
    const withoutLeading = chunk.slice(leading.length);
    const trailing = TRAILING_PUNCTUATION.exec(withoutLeading)?.[0] ?? "";
    const word = withoutLeading.slice(0, withoutLeading.length - trailing.length);

    // یک تکه که فقط نقطه‌گذاری است (مثلاً یک «—» تنها) واژه نیست؛ به
    // جداکنندهٔ توکنِ قبلی می‌چسبد تا از متن حذف نشود.
    if (!word) {
      if (out.length > 0) out[out.length - 1].separatorAfter += chunk + whitespace;
      else pendingLeading += chunk + whitespace;
      continue;
    }

    // نقطه‌گذاریِ آغازین («» و پرانتز) به جداکنندهٔ توکنِ قبلی می‌رود، چون
    // بخشی از واژه نیست و نباید روی چیپِ نقش دیده شود.
    //
    // ⚠️ مگر وقتی توکنِ قبلی‌ای وجود ندارد. مدل «جداکنندهٔ پیش از توکن» ندارد،
    // پس گیومهٔ ابتدای جمله جایی جز خودِ متنِ توکن ندارد — و انداختنش یعنی
    // جمله‌ای که ذخیره می‌شود با جمله‌ای که مدیر تایپ کرده یکی نیست. همان
    // کاری که بستهٔ محتوایی موجود هم می‌کند («از).
    if (leading) {
      if (out.length > 0) out[out.length - 1].separatorAfter += leading;
      else pendingLeading += leading;
    }

    out.push({
      id: `t${out.length + 1}`,
      text: pendingLeading + word,
      separatorAfter: trailing + whitespace,
      acceptedRoleKeys: [],
    });
    pendingLeading = "";
  }

  return out;
}

/** چسباندنِ یک توکن به توکنِ بعدی — برای واژه‌های مرکبی که با فاصله نوشته
 *  می‌شوند («مفعولِ مطلق» به‌عنوان یک واحد). نقش‌ها از توکنِ اول می‌مانند. */
export function mergeTokenWithNext(
  tokens: AuthoredToken[],
  index: number,
): AuthoredToken[] {
  if (index < 0 || index >= tokens.length - 1) return tokens;
  const current = tokens[index];
  const next = tokens[index + 1];
  const merged: AuthoredToken = {
    ...current,
    text: `${current.text}${current.separatorAfter}${next.text}`,
    separatorAfter: next.separatorAfter,
  };
  return renumber([...tokens.slice(0, index), merged, ...tokens.slice(index + 2)]);
}

/** شناسه‌ها همیشه t1..tn می‌مانند تا خواندنشان در payload ساده بماند. */
function renumber(tokens: AuthoredToken[]): AuthoredToken[] {
  return tokens.map((t, i) => ({ ...t, id: `t${i + 1}` }));
}

/** متنِ جملهٔ بازسازی‌شده از توکن‌ها — برای پیش‌نمایش و برای فهرستِ پنل. */
export function sentenceFromTokens(tokens: readonly AuthoredToken[]): string {
  return tokens.map((t) => t.text + t.separatorAfter).join("").trim();
}

/**
 * ساختنِ سؤالِ کاملِ قابلِ ذخیره از پیش‌نویسِ ویرایشگر.
 *
 * دو چیز از روی نقش‌های انتخاب‌شده *مشتق* می‌شوند و مدیر لمسشان نمی‌کند:
 *
 *   • `roleDefinitions` — هر نقشی که جایی استفاده شده، یک بار.
 *   • `pieces` — برای هر سوکت یک قطعه، به‌علاوهٔ قطعه‌های فریب. سوکتی که چند
 *     نقش را می‌پذیرد قطعه‌اش را از *اولین* نقشِ فهرست می‌گیرد؛ اگر آن انتخاب
 *     سؤال را بن‌بست‌پذیر کند، اعتبارسنجِ خودِ بازی همان‌جا در پنل می‌گوید.
 *
 * `circuitOrder` فقط وقتی می‌ماند که هنوز دقیقاً همان سوکت‌ها را پوشش بدهد؛
 * وگرنه حذف می‌شود و بازی به ترتیبِ جمله برمی‌گردد — که رفتارِ پیش‌فرضِ
 * تعریف‌شده در types.ts است.
 */
export function buildQuestionFromDraft(
  draft: AuthoredQuestion,
  meta: { id: string },
): GrammarCircuitQuestion {
  const tokens: GrammarCircuitToken[] = draft.tokens.map((t) => ({
    id: t.id,
    text: t.text,
    separatorAfter: t.separatorAfter,
    ...(t.acceptedRoleKeys.length > 0
      ? { roleSlot: { acceptedRoleKeys: [...new Set(t.acceptedRoleKeys)] } }
      : {}),
  }));

  const pieces: GrammarRolePiece[] = [];
  const usedRoleKeys: string[] = [];
  const perRoleCount = new Map<string, number>();

  const addPiece = (roleKey: string) => {
    const n = (perRoleCount.get(roleKey) ?? 0) + 1;
    perRoleCount.set(roleKey, n);
    pieces.push({ id: `p-${roleKey}-${n}`, roleKey });
  };

  for (const token of draft.tokens) {
    if (token.acceptedRoleKeys.length === 0) continue;
    usedRoleKeys.push(...token.acceptedRoleKeys);
    addPiece(token.acceptedRoleKeys[0]);
  }
  for (const roleKey of draft.distractorRoleKeys) {
    usedRoleKeys.push(roleKey);
    addPiece(roleKey);
  }

  const slotIds = draft.tokens
    .filter((t) => t.acceptedRoleKeys.length > 0)
    .map((t) => t.id);

  const order = draft.circuitOrder;
  const orderStillValid =
    !!order &&
    order.length === slotIds.length &&
    order.every((id) => slotIds.includes(id));

  return {
    id: meta.id,
    type: draft.type,
    tokens,
    roleDefinitions: roleDefinitionsFor(usedRoleKeys),
    pieces,
    ...(orderStillValid ? { circuitOrder: order } : {}),
  };
}

/** راهِ برگشت: از یک سؤالِ ذخیره‌شده به پیش‌نویسِ ویرایشگر.
 *
 *  قطعه‌های فریب همان‌هایی‌اند که بیشتر از نیازِ سوکت‌ها در سینی‌اند — با
 *  شمردنِ قطعه‌های هر نقش و کم کردنِ آنچه سوکت‌ها لازم دارند به‌دست می‌آیند. */
export function draftFromQuestion(question: GrammarCircuitQuestion): AuthoredQuestion {
  const tokens: AuthoredToken[] = (question.tokens ?? []).map((t) => ({
    id: t.id,
    text: t.text,
    separatorAfter: t.separatorAfter,
    acceptedRoleKeys: [...(t.roleSlot?.acceptedRoleKeys ?? [])],
  }));

  const needed = new Map<string, number>();
  for (const token of tokens) {
    if (token.acceptedRoleKeys.length === 0) continue;
    const key = token.acceptedRoleKeys[0];
    needed.set(key, (needed.get(key) ?? 0) + 1);
  }

  const distractorRoleKeys: string[] = [];
  const have = new Map<string, number>();
  for (const piece of question.pieces ?? []) {
    const n = (have.get(piece.roleKey) ?? 0) + 1;
    have.set(piece.roleKey, n);
    if (n > (needed.get(piece.roleKey) ?? 0)) distractorRoleKeys.push(piece.roleKey);
  }

  return {
    type: question.type ?? "sentence",
    tokens,
    distractorRoleKeys,
    ...(question.circuitOrder ? { circuitOrder: [...question.circuitOrder] } : {}),
  };
}
