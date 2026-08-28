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

  return {
    question,
    circuitSlots,
    layoutSlots,
    trayPieces,
    slotByTokenId,
    pieceById: new Map(question.pieces.map((p) => [p.id, p])),
    roleByKey: new Map(question.roleDefinitions.map((r) => [r.key, r])),
    requiredSlotCount: layoutSlots.length,
  };
}

/** ترتیبِ سؤال‌های یک جلسه، یک بار و در لحظهٔ شروع ساخته می‌شود. */
export function buildSessionQuestions(
  questions: readonly GrammarCircuitQuestion[],
  count: number,
  seed: number,
): GrammarCircuitQuestion[] {
  return shuffled(questions, mulberry32(seed)).slice(0, Math.max(1, count));
}

/** بازسازیِ دقیقِ متن — بدونِ ساختنِ فاصله یا نشانه‌گذاریِ من‌درآوردی. */
export function reconstructText(question: GrammarCircuitQuestion): string {
  return question.tokens.map((t) => t.text + t.separatorAfter).join("");
}
