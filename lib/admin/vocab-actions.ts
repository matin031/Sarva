"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminVocabWord = {
  id: string;
  word: string;
  meaning: string;
  image: string;
  sortIndex: number;
};

const GRADES = ["dahom", "yazdahom", "davazdahom"] as const;
type Grade = (typeof GRADES)[number];

function isGrade(g: string): g is Grade {
  return (GRADES as readonly string[]).includes(g);
}

type WordRow = { id: string; word: string; meaning: string; image: string | null; sort_index: number };

/** All words of one lesson, for the admin list. */
export async function vocabAdminList(grade: string, lesson: number): Promise<AdminVocabWord[]> {
  await requireAdmin();
  if (!isGrade(grade)) throw new Error("پایهٔ نامعتبر است.");
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("vocab_words")
    .select("id, word, meaning, image, sort_index")
    .eq("grade", grade)
    .eq("lesson", lesson)
    .order("sort_index", { ascending: true });
  if (error) throw new Error(`vocabAdminList: ${error.message}`);
  return (data ?? []).map((r: WordRow) => ({
    id: r.id,
    word: r.word,
    meaning: r.meaning,
    image: r.image ?? "",
    sortIndex: r.sort_index,
  }));
}

export type VocabWordInput = {
  id?: string; // present = editing an existing word
  grade: string;
  lesson: number;
  word: string;
  meaning: string;
  image: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

/** Create a new word or update an existing one. */
export async function vocabAdminUpsert(input: VocabWordInput): Promise<ActionResult> {
  await requireAdmin();
  if (!isGrade(input.grade)) return { ok: false, error: "پایهٔ نامعتبر است." };
  if (!Number.isInteger(input.lesson) || input.lesson < 1 || input.lesson > 18) {
    return { ok: false, error: "شمارهٔ درس باید بین ۱ تا ۱۸ باشد." };
  }
  const word = input.word.trim();
  const meaning = input.meaning.trim();
  const image = input.image.trim();
  if (!word) return { ok: false, error: "واژه را وارد کنید." };
  if (!meaning) return { ok: false, error: "معنی را وارد کنید." };

  const supabase = createSupabaseAdmin();

  if (input.id) {
    const { error } = await supabase
      .from("vocab_words")
      .update({ grade: input.grade, lesson: input.lesson, word, meaning, image })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // new word: append after the current last one in this lesson
  const { data: last } = await supabase
    .from("vocab_words")
    .select("sort_index")
    .eq("grade", input.grade)
    .eq("lesson", input.lesson)
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = (last?.sort_index ?? 0) + 1;

  const { error } = await supabase
    .from("vocab_words")
    .insert({ grade: input.grade, lesson: input.lesson, word, meaning, image, sort_index: nextSort });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function vocabAdminDelete(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("vocab_words").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
