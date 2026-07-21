// Browser-side data access for the واژه‌یاب game.
// Words are public content (anyone, signed in or not, can read them to play);
// per-user wrong/right answers are logged to `vocab_answers` for the panel.
import { supabase } from "@/lib/supabase";
import type { VocabWord } from "./vocab-data";

type WordRow = { id: string; word: string; meaning: string; image: string | null };

/** All words of one lesson, ordered, for playing that lesson. */
export async function fetchLessonWords(grade: string, lesson: number): Promise<VocabWord[]> {
  const { data, error } = await supabase
    .from("vocab_words")
    .select("id, word, meaning, image")
    .eq("grade", grade)
    .eq("lesson", lesson)
    .order("sort_index", { ascending: true });
  if (error) {
    console.error("vocab_words fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: WordRow) => ({
    id: r.id,
    word: r.word,
    meaning: r.meaning,
    image: r.image ?? "",
  }));
}

/** How many *pictured* words each lesson of a book has — drives the lesson list. */
export async function fetchGradePlayableCounts(grade: string): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from("vocab_words")
    .select("lesson, image")
    .eq("grade", grade);
  if (error) {
    console.error("vocab_words count failed:", error.message);
    return {};
  }
  const counts: Record<number, number> = {};
  for (const r of (data ?? []) as { lesson: number; image: string | null }[]) {
    if ((r.image ?? "").trim().length > 0) {
      counts[r.lesson] = (counts[r.lesson] ?? 0) + 1;
    }
  }
  return counts;
}

/** Fire-and-forget: record one answer so the student sees their misses in the panel. */
export function logVocabAnswer(
  userId: string,
  input: {
    grade: string;
    lesson: number;
    word: string;
    meaning: string;
    image: string;
    isCorrect: boolean;
  },
) {
  Promise.resolve(
    supabase.from("vocab_answers").insert({
      user_id: userId,
      grade: input.grade,
      lesson: input.lesson,
      word: input.word,
      meaning: input.meaning,
      image: input.image,
      is_correct: input.isCorrect,
    }),
  )
    .then(({ error }) => {
      if (error) {
        // most likely the vocab_answers table/migration hasn't been run yet —
        // see supabase/migrations/20260721_vocab_answers.sql
        console.error("vocab_answers insert failed:", error.message || error);
      }
    })
    .catch((err: unknown) => console.error("vocab_answers insert threw:", err));
}
