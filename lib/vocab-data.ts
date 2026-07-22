// Structure for the "واژه‌یاب" picture-vocabulary game.
//
// The lesson STRUCTURE (three books, 18 lessons each, with the two "آزاد"
// free lessons per book that carry no words) lives here as static config.
// The WORDS themselves live in the database (table `vocab_words`) so they
// can be added/edited from the admin panel — see lib/vocab-db.ts for the
// fetch/log helpers and lib/admin/vocab-actions.ts for the admin CRUD.

export type VocabWord = {
  id: string;
  word: string;
  meaning: string; // full explanation, shown after answering
  image: string; // image URL (local /public path or remote), empty = no picture yet
};

export type VocabLesson = {
  id: string;
  number: number; // 1..18
  title: string;
  free: boolean; // "آزاد" lesson — has no words, not playable
};

export type VocabGrade = {
  id: "dahom" | "yazdahom" | "davazdahom";
  title: string;
  lessons: VocabLesson[];
};

const ORDINALS = [
  "",
  "اول",
  "دوم",
  "سوم",
  "چهارم",
  "پنجم",
  "ششم",
  "هفتم",
  "هشتم",
  "نهم",
  "دهم",
  "یازدهم",
  "دوازدهم",
  "سیزدهم",
  "چهاردهم",
  "پانزدهم",
  "شانزدهم",
  "هفدهم",
  "هجدهم",
];

function buildLessons(freeLessons: number[]): VocabLesson[] {
  return Array.from({ length: 18 }, (_, i) => {
    const number = i + 1;
    return {
      id: `d${number}`,
      number,
      title: `درس ${ORDINALS[number]}`,
      free: freeLessons.includes(number),
    };
  });
}

// Free ("آزاد") lessons per book — these carry no words and are not playable:
//   دهم: درس ۴ و ۱۵    یازدهم: درس ۴ و ۱۳    دوازدهم: درس ۴ و ۱۵
export const VOCAB_GRADES: VocabGrade[] = [
  { id: "dahom", title: "دهم", lessons: buildLessons([4, 15]) },
  { id: "yazdahom", title: "یازدهم", lessons: buildLessons([4, 13]) },
  { id: "davazdahom", title: "دوازدهم", lessons: buildLessons([4, 15]) },
];

export type VocabQuestion = {
  answer: VocabWord;
  options: VocabWord[]; // the answer + 2 distractors, shuffled
};

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

/** Only words that have a picture are quizzable. */
export function playableWords(words: VocabWord[]): VocabWord[] {
  return words.filter((w) => w.image.trim().length > 0);
}

/** Pick `n` distractors for `answer`: prefer words from the same lesson, then
 *  fill from the wider pool (the whole grade) — so a lesson with even a single
 *  pictured word is still playable as long as the grade has enough words. */
function pickDistractors(answer: VocabWord, sameSet: VocabWord[], pool: VocabWord[], n: number): VocabWord[] {
  const chosen: VocabWord[] = [];
  const take = (list: VocabWord[]) => {
    for (const w of list) {
      if (chosen.length >= n) break;
      if (w.id === answer.id || chosen.some((c) => c.id === w.id)) continue;
      chosen.push(w);
    }
  };
  take(shuffle(sameSet)); // same-lesson distractors first
  if (chosen.length < n) take(shuffle(pool)); // then borrow from the rest of the grade
  return chosen;
}

/** Learning round: every pictured word of the lesson becomes a 3-option
 *  question. `pool` is the wider word set (the whole grade) that distractors
 *  may be borrowed from; it defaults to the lesson's own words. */
export function buildVocabRound(answers: VocabWord[], pool: VocabWord[] = answers): VocabQuestion[] {
  const answerPics = playableWords(answers);
  const poolPics = playableWords(pool);
  if (answerPics.length < 1 || poolPics.length < 3) return [];
  return shuffle(answerPics).map((answer) => {
    const distractors = pickDistractors(answer, answerPics, poolPics, 2);
    return { answer, options: shuffle([answer, ...distractors]) };
  });
}

export type ChallengeStep = { answer: VocabWord; options: VocabWord[] }; // options.length === 2

/** Challenge run: every pictured word of the lesson, each with one distractor
 *  (same-lesson first, then borrowed from the grade `pool`). */
export function buildChallenge(answers: VocabWord[], pool: VocabWord[] = answers): ChallengeStep[] {
  const answerPics = playableWords(answers);
  const poolPics = playableWords(pool);
  if (answerPics.length < 1 || poolPics.length < 3) return [];
  return shuffle(answerPics).map((answer) => {
    const distractors = pickDistractors(answer, answerPics, poolPics, 1);
    return { answer, options: shuffle([answer, ...distractors]) };
  });
}
