import type {
  GrammarCircuitQuestion,
  GrammarRolePiece,
  PreparedQuestion,
  PreparedSlot,
} from "./types";

/** PRNG با دانه — تا بُرخوردنِ سینی قابلِ بازتولید و آزمون‌پذیر بماند. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** عکسِ فوریِ سؤال. اینجا و *فقط* اینجا سینی بُر می‌خورد؛ از این لحظه به بعد
 *  همه‌چیز ثابت است و رندرِ دوبارهٔ React ترتیب را عوض نمی‌کند. */
export function prepareQuestion(
  question: GrammarCircuitQuestion,
  seed: number,
): PreparedQuestion {
  const layoutSlots: PreparedSlot[] = [];
  question.tokens.forEach((token, index) => {
    if (!token.roleSlot) return;
    layoutSlots.push({
      tokenId: token.id,
      tokenIndex: index,
      acceptedRoleKeys: token.roleSlot.acceptedRoleKeys,
    });
  });

  const slotByTokenId = new Map<string, PreparedSlot>(
    layoutSlots.map((slot) => [slot.tokenId, slot]),
  );

  // ترتیبِ مدار معنایی است و از داده می‌آید — نه از جای عناصر روی صفحه.
  const circuitSlots: PreparedSlot[] = question.circuitOrder
    ? question.circuitOrder.map((id) => slotByTokenId.get(id)!).filter(Boolean)
    : layoutSlots.slice();

  const trayPieces: GrammarRolePiece[] = shuffled(
    question.pieces,
    mulberry32(seed),
  );

  /* ترتیبِ بررسی: از راست‌ترین هدف به چپ‌ترین — یعنی همان ترتیبِ خواندنِ
     فارسی. مبنایش `circuitOrder`ِ دادهٔ معتبر است و در نبودش ترتیبِ توکن‌ها؛
     هیچ‌وقت از مرتب‌کردنِ مختصاتِ x در DOM درنمی‌آید، وگرنه اسکرول و چیدمانِ
     واکنش‌گرا می‌توانستند ترتیبِ آموزشی را عوض کنند. اینجا یک بار ثابت
     می‌شود و تا پایانِ سؤال دست‌نخورده می‌ماند. */
  const validationOrder: string[] = circuitSlots.map((s) => s.tokenId);

  return {
    question,
    validationOrder,
    circuitSlots,
    layoutSlots,
    trayPieces,
    slotByTokenId,
    pieceById: new Map(question.pieces.map((p) => [p.id, p])),
    roleByKey: new Map(question.roleDefinitions.map((r) => [r.key, r])),
    requiredSlotCount: layoutSlots.length,
  };
}

/** ترتیبِ سؤال‌های یک جلسه، یک بار و در لحظهٔ شروع ساخته می‌شود.
 *
 *  وقتی چند درس انتخاب شده، نمونه‌گیری *چرخشی* است نه پشتِ‌سرِهم: اول یک
 *  پرسش از هر درس، بعد دورِ دوم، و همین‌طور. وگرنه یک جلسهٔ پنج‌تایی از سه
 *  درس، عملاً فقط درسِ اول را تمرین می‌داد.
 *
 *  داخلِ هر درس ترتیب بُر می‌خورد تا دو جلسهٔ پشتِ سرِ هم یکسان نباشند. */
export function buildSessionQuestions(
  questions: readonly GrammarCircuitQuestion[],
  count: number,
  seed: number,
  lessons?: readonly number[],
): GrammarCircuitQuestion[] {
  const rand = mulberry32(seed);
  const take = Math.max(1, count);

  if (!lessons || lessons.length <= 1) {
    return shuffled(questions, rand).slice(0, take);
  }

  const byLesson = new Map<number, GrammarCircuitQuestion[]>();
  for (const lesson of lessons) byLesson.set(lesson, []);
  const orphans: GrammarCircuitQuestion[] = [];
  for (const q of questions) {
    const bucket = q.lesson !== undefined ? byLesson.get(q.lesson) : undefined;
    if (bucket) bucket.push(q);
    else orphans.push(q);
  }
  for (const [lesson, bucket] of byLesson) {
    byLesson.set(lesson, shuffled(bucket, rand));
  }

  const out: GrammarCircuitQuestion[] = [];
  let round = 0;
  let added = true;
  while (out.length < take && added) {
    added = false;
    for (const lesson of lessons) {
      const bucket = byLesson.get(lesson);
      const item = bucket?.[round];
      if (item) {
        out.push(item);
        added = true;
        if (out.length === take) break;
      }
    }
    round += 1;
  }
  if (out.length < take) out.push(...shuffled(orphans, rand).slice(0, take - out.length));
  return out;
}

/** بازسازیِ دقیقِ متن — بدونِ ساختنِ فاصله یا نشانه‌گذاریِ من‌درآوردی. */
export function reconstructText(question: GrammarCircuitQuestion): string {
  return question.tokens.map((t) => t.text + t.separatorAfter).join("");
}
