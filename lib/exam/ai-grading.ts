import type { SeedPart } from "./seed-data/seed-types";
import type { RichPassage } from "./content-schemas";
import { matchesAny, normalizeFa, statusFromRatio, type PartGradeResult } from "./grading";

/**
 * Server-only AI grading for the open-ended exam parts that gradePart()
 * leaves as "needs_review" (gradingMode "ai_semantic" / "ai_partial_credit").
 * Uses Google's Gemini API (free tier) via plain fetch — no SDK dependency.
 *
 * Design choices that matter:
 *  - Exact matches short-circuit BEFORE any network call, so a student who
 *    writes the textbook answer verbatim is scored for free and instantly.
 *    The model is only consulted for answers that aren't literal matches.
 *  - Every failure path (no API key, network blocked, unparseable reply)
 *    falls back to "needs_review" instead of throwing. An exam must never
 *    break because the grader is unreachable — e.g. Gemini is geo-blocked
 *    from inside Iran, so this only works when the server runs abroad
 *    (Vercel etc.); locally it degrades to "needs_review", not an error.
 *  - This file is server-only (imported by the "use server" submit action),
 *    same boundary as grading.ts — it reads the full answer key.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 15_000;

type SubItem = { label?: string; studentAnswer: string; accepted: string[] };
type AIGradable = { questionText: string; items: SubItem[] };

function passageBlankIds(passage: RichPassage): string[] {
  const tokens = passage.tokens ?? passage.lines?.flat() ?? [];
  return tokens.filter((t) => t.kind === "blank").map((t) => (t as { blankId: string }).blankId);
}

/** Pulls the human-readable prompt + (studentAnswer, acceptedAnswers) pairs
 *  out of a part, or null for a type we don't AI-grade. */
function extractGradable(part: SeedPart, submitted: unknown): AIGradable | null {
  const content = part.content;
  const correct = part.correctAnswer as Record<string, unknown>;

  switch (content.type) {
    case "short-text-answer": {
      return {
        questionText: content.questionText,
        items: [{ studentAnswer: String(submitted ?? ""), accepted: (correct.accepted as string[]) ?? [] }],
      };
    }

    case "verse-completion": {
      return {
        questionText: `مصراع دوم این بیت را کامل کنید: «${content.firstMesra}»`,
        items: [{ studentAnswer: String(submitted ?? ""), accepted: (correct.accepted as string[]) ?? [] }],
      };
    }

    case "word-meaning-input": {
      const blankIds = passageBlankIds(content.passage);
      const submittedMap = (submitted as Record<string, string>) ?? {};
      return {
        questionText: "معنی واژهٔ مشخّص‌شده را بنویسید.",
        items: blankIds.map((id) => ({
          studentAnswer: submittedMap[id] ?? "",
          accepted: (correct[id] as string[]) ?? [],
        })),
      };
    }

    case "two-answer-text": {
      const submittedMap = (submitted as Record<string, string>) ?? {};
      return {
        questionText: content.questionText,
        items: content.fields.map((f) => ({
          label: f.label,
          studentAnswer: submittedMap[f.id] ?? "",
          accepted: (correct[f.id] as string[]) ?? [],
        })),
      };
    }

    default:
      return null;
  }
}

type GeminiScore = { score: number };

async function callGemini(prompt: string, itemCount: number): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { score: { type: "number" } },
                    required: ["score"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      console.error(`Gemini grading HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = JSON.parse(text) as { results?: GeminiScore[] };
    const results = parsed.results;
    if (!Array.isArray(results) || results.length !== itemCount) return null;

    return results.map((r) => Math.max(0, Math.min(1, Number(r.score) || 0)));
  } catch (err) {
    console.error("Gemini grading failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(g: AIGradable, hint: string | undefined, items: SubItem[]): string {
  const itemBlocks = items
    .map((it, i) => {
      const lines = [`مورد ${i + 1}:`];
      if (it.label) lines.push(`  عنوان: ${it.label}`);
      lines.push(`  پاسخ‌های صحیح (کلید): ${it.accepted.join(" | ")}`);
      lines.push(`  پاسخ دانش‌آموز: ${it.studentAnswer || "(خالی)"}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "تو یک مصحّحِ باتجربهٔ امتحان نهاییِ درس «فارسی» هستی.",
    "برای هر مورد، پاسخ دانش‌آموز را با پاسخ‌های صحیح (کلید) مقایسه کن و یک نمره بین ۰ تا ۱ بده.",
    "معیار، درستیِ «معنایی» است نه لفظیِ کلمه‌به‌کلمه: مترادف‌ها، بازنویسیِ روان، و پاسخ‌هایی که مفهوم اصلی را درست رسانده‌اند نمرهٔ کامل (۱) می‌گیرند.",
    "اگر مفهوم اصلی ناقص است نمرهٔ جزئی (مثلاً ۰٫۵) و اگر غلط یا نامرتبط یا خالی است نمرهٔ ۰ بده.",
    "سخت‌گیریِ بی‌مورد روی نگارش، نیم‌فاصله و علائم نکن.",
    hint ? `راهنمای تصحیحِ این سؤال: ${hint}` : "",
    "",
    `سؤال: ${g.questionText}`,
    "",
    itemBlocks,
    "",
    'خروجی را فقط به‌صورت JSON با کلید "results" بده که آرایه‌ای هم‌ترتیب با موردهای بالاست و هر عضو یک "score" دارد.',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Grades one AI-mode part. Returns needs_review on any failure so the
 *  exam flow never breaks; the caller treats that exactly like it did
 *  before AI grading existed. */
export async function gradePartWithAI(part: SeedPart, submitted: unknown): Promise<PartGradeResult> {
  const maxScore = part.score;
  const gradable = extractGradable(part, submitted);
  if (!gradable || gradable.items.length === 0) {
    return { score: 0, maxScore, status: "needs_review" };
  }

  // Per-item ratios: exact matches are free (no API call); only the rest go
  // to the model. If nothing needs the model, we never touch the network.
  const ratios: (number | null)[] = gradable.items.map((it) =>
    matchesAny(it.studentAnswer, it.accepted) ? 1 : normalizeFa(it.studentAnswer).length === 0 ? 0 : null,
  );

  const needsAI = gradable.items.filter((_, i) => ratios[i] === null);
  if (needsAI.length > 0) {
    const prompt = buildPrompt(gradable, part.aiGradingHint, needsAI);
    const aiScores = await callGemini(prompt, needsAI.length);
    if (!aiScores) {
      return { score: 0, maxScore, status: "needs_review" };
    }
    let ai = 0;
    for (let i = 0; i < ratios.length; i++) {
      if (ratios[i] === null) ratios[i] = aiScores[ai++];
    }
  }

  const avg = (ratios as number[]).reduce((s, r) => s + r, 0) / ratios.length;
  return { score: avg * maxScore, maxScore, status: statusFromRatio(avg) };
}
