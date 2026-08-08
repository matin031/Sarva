"use client";

// دسترسی دادهٔ بازی واژه‌یاب، از سمت مرورگر.
//
// قبلاً مستقیم با کلاینت Supabase به دیتابیس می‌زد. حالا از /api/v1/vocab/*
// رد می‌شود. امضای هر سه تابع دست‌نخورده مانده تا VocabGame.tsx تغییری لازم
// نداشته باشد.
import { apiGet, apiPost } from "@/lib/api/client";
import type { VocabWord } from "@/lib/vocab-data";

type WordPayload = {
  words: { id: string; word: string; meaning: string; image: string; lesson: number }[];
};

/** همهٔ واژه‌های یک درس، به ترتیب. */
export async function fetchLessonWords(grade: string, lesson: number): Promise<VocabWord[]> {
  const result = await apiGet<WordPayload>(
    `/api/v1/vocab/words?grade=${encodeURIComponent(grade)}&lesson=${lesson}`,
  );

  if (!result.ok) {
    console.error("vocab words fetch failed:", result.errors.join(" "));
    return [];
  }

  return result.data.words.map((w) => ({
    id: w.id,
    word: w.word,
    meaning: w.meaning,
    image: w.image,
  }));
}

export type GradeWord = { lesson: number; word: VocabWord };

/** هر واژهٔ *تصویردارِ* یک کتاب، با شمارهٔ درسش. هم فهرست درس‌ها (تعداد هر
 *  درس) را می‌سازد و هم مخزن مشترک گزینه‌های نادرست را، تا درسی که فقط یکی دو
 *  واژهٔ تصویردار دارد هم قابل بازی بماند. */
export async function fetchGradePicturedWords(grade: string): Promise<GradeWord[]> {
  const result = await apiGet<WordPayload>(
    `/api/v1/vocab/words?grade=${encodeURIComponent(grade)}`,
  );

  if (!result.ok) {
    console.error("vocab grade fetch failed:", result.errors.join(" "));
    return [];
  }

  return result.data.words
    .filter((w) => w.image.trim().length > 0)
    .map((w) => ({
      lesson: w.lesson,
      word: { id: w.id, word: w.word, meaning: w.meaning, image: w.image },
    }));
}

/** ثبت یک پاسخ، بدون منتظر ماندن — تا دانش‌آموز واژه‌های ازدست‌رفته‌اش را در
 *  پنل ببیند.
 *
 *  پارامتر userId دیگر استفاده نمی‌شود: سرور کاربر را از کوکی سشن می‌شناسد و
 *  به شناسه‌ای که مرورگر ادعا می‌کند اعتماد نمی‌کند. برای دست‌نخورده ماندن
 *  محلِ فراخوانی در VocabGame.tsx نگه داشته شده. */
export function logVocabAnswer(
  _userId: string,
  input: {
    grade: string;
    lesson: number;
    word: string;
    meaning: string;
    image: string;
    isCorrect: boolean;
  },
) {
  void apiPost("/api/v1/vocab/answer", input).then((result) => {
    if (!result.ok) console.error("vocab answer save failed:", result.errors.join(" "));
  });
}
