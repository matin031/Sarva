import type { GrammarCircuitQuestion } from "./types";
import { hasCompleteAssignment, isChoiceSafe, type MatchingSlot } from "./matching";

/** اعتبارسنجیِ سؤال، *پیش از* شروعِ بازی.
 *
 *  سؤالِ خراب هرگز نباید به دانش‌آموز نشان داده شود: در حالتِ توسعه با تشخیصِ
 *  دقیق سر و صدا می‌کند، در محیطِ واقعی بی‌سروصدا کنار گذاشته می‌شود. */
export interface QuestionValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateGrammarCircuitQuestion(
  question: GrammarCircuitQuestion,
): QuestionValidationResult {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(msg);

  if (!question || typeof question !== "object") {
    return { ok: false, errors: ["سؤال یک شیء معتبر نیست."] };
  }
  if (!question.id || typeof question.id !== "string") {
    at("شناسهٔ سؤال خالی است.");
  }

  /* --- نقش‌ها --- */
  const roleKeys = new Set<string>();
  if (!Array.isArray(question.roleDefinitions) || question.roleDefinitions.length === 0) {
    at("فهرستِ نقش‌ها خالی است.");
  } else {
    for (const role of question.roleDefinitions) {
      if (!role?.key) {
        at("یک نقش بدونِ key تعریف شده است.");
        continue;
      }
      if (roleKeys.has(role.key)) at(`نقشِ تکراری: «${role.key}».`);
      roleKeys.add(role.key);
      if (!role.label) at(`نقشِ «${role.key}» برچسبِ فارسی ندارد.`);
    }
  }

  /* --- توکن‌ها --- */
  const tokenIds = new Set<string>();
  const slotTokenIds: string[] = [];
  if (!Array.isArray(question.tokens) || question.tokens.length === 0) {
    at("جمله هیچ توکنی ندارد.");
  } else {
    for (const token of question.tokens) {
      if (!token?.id) {
        at("یک توکن بدونِ شناسه وجود دارد.");
        continue;
      }
      if (tokenIds.has(token.id)) at(`شناسهٔ توکنِ تکراری: «${token.id}».`);
      tokenIds.add(token.id);
      if (typeof token.text !== "string" || token.text.length === 0) {
        at(`توکنِ «${token.id}» متن ندارد.`);
      }
      if (typeof token.separatorAfter !== "string") {
        at(`توکنِ «${token.id}» جداکنندهٔ صریح ندارد.`);
      }
      if (token.roleSlot) {
        slotTokenIds.push(token.id);
        const accepted = token.roleSlot.acceptedRoleKeys;
        if (!Array.isArray(accepted) || accepted.length === 0) {
          at(`سوکتِ «${token.id}» هیچ نقشِ پذیرفته‌ای ندارد.`);
        } else {
          const seen = new Set<string>();
          for (const key of accepted) {
            if (seen.has(key)) at(`سوکتِ «${token.id}» نقشِ «${key}» را دوبار پذیرفته است.`);
            seen.add(key);
            if (!roleKeys.has(key)) {
              at(`سوکتِ «${token.id}» به نقشِ تعریف‌نشدهٔ «${key}» ارجاع می‌دهد.`);
            }
          }
        }
      }
    }
  }
  if (slotTokenIds.length === 0) at("سؤال هیچ سوکتِ لازمی ندارد.");

  /* --- قطعه‌ها --- */
  const pieceIds = new Set<string>();
  if (!Array.isArray(question.pieces) || question.pieces.length === 0) {
    at("سینیِ نقش‌ها خالی است.");
  } else {
    for (const piece of question.pieces) {
      if (!piece?.id) {
        at("یک قطعه بدونِ شناسه وجود دارد.");
        continue;
      }
      if (pieceIds.has(piece.id)) at(`شناسهٔ قطعهٔ تکراری: «${piece.id}».`);
      pieceIds.add(piece.id);
      if (!roleKeys.has(piece.roleKey)) {
        at(`قطعهٔ «${piece.id}» به نقشِ تعریف‌نشدهٔ «${piece.roleKey}» ارجاع می‌دهد.`);
      }
    }
  }
  if (question.pieces?.length < slotTokenIds.length) {
    at("تعدادِ قطعه‌ها از تعدادِ سوکت‌ها کمتر است.");
  }

  /* --- ترتیبِ مدار --- */
  if (question.circuitOrder) {
    const seen = new Set<string>();
    for (const id of question.circuitOrder) {
      if (seen.has(id)) at(`ترتیبِ مدار شناسهٔ «${id}» را دوبار دارد.`);
      seen.add(id);
      if (!tokenIds.has(id)) at(`ترتیبِ مدار به توکنِ ناشناختهٔ «${id}» ارجاع می‌دهد.`);
      else if (!slotTokenIds.includes(id)) {
        at(`ترتیبِ مدار شاملِ «${id}» است که سوکت ندارد.`);
      }
    }
    for (const id of slotTokenIds) {
      if (!seen.has(id)) at(`سوکتِ «${id}» در ترتیبِ مدار نیامده است.`);
    }
  }

  // تا وقتی ساختار خراب است، آزمون‌های حل‌پذیری نتیجهٔ گمراه‌کننده می‌دهند.
  if (errors.length > 0) return { ok: false, errors };

  const slots: MatchingSlot[] = slotTokenIds.map((id) => {
    const token = question.tokens.find((t) => t.id === id)!;
    return { id, acceptedRoleKeys: token.roleSlot!.acceptedRoleKeys };
  });
  const pieceRoleKeys = question.pieces.map((p) => p.roleKey);

  const feasible = hasCompleteAssignment(slots, pieceRoleKeys);
  if (!feasible.ok) {
    at(feasible.reason ?? "سؤال حل‌شدنی نیست.");
    return { ok: false, errors };
  }

  const safe = isChoiceSafe(slots, pieceRoleKeys);
  if (!safe.ok) at(safe.reason ?? "سؤال بن‌بست‌پذیر است.");

  return { ok: errors.length === 0, errors };
}

/** غربالِ فهرستِ سؤال‌ها.
 *
 *  در توسعه، هر سؤالِ ردشده با دلیلِ دقیقش در کنسول می‌آید تا کسی که داده را
 *  می‌نویسد بفهمد کجا را باید درست کند؛ در محیطِ واقعی فقط کنار گذاشته می‌شود. */
export function filterValidQuestions(
  questions: readonly GrammarCircuitQuestion[],
): GrammarCircuitQuestion[] {
  const kept: GrammarCircuitQuestion[] = [];
  for (const question of questions) {
    const result = validateGrammarCircuitQuestion(question);
    if (result.ok) {
      kept.push(question);
      continue;
    }
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[grammar-circuit] سؤالِ «${question?.id ?? "?"}» نامعتبر است و کنار گذاشته شد:\n` +
          result.errors.map((e) => `  • ${e}`).join("\n"),
      );
    }
  }
  return kept;
}
