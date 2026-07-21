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

/** Learning round: every pictured word becomes a 3-option question, shuffled. */
export function buildVocabRound(words: VocabWord[]): VocabQuestion[] {
  const pool = playableWords(words);
  if (pool.length < 3) return [];
  return shuffle(pool).map((answer) => {
    const distractors = shuffle(pool.filter((w) => w.id !== answer.id)).slice(0, 2);
    return { answer, options: shuffle([answer, ...distractors]) };
  });
}

export type ChallengeStep = { answer: VocabWord; options: VocabWord[] }; // options.length === 2

/** Challenge run: every pictured word in random order, each with one distractor. */
export function buildChallenge(words: VocabWord[]): ChallengeStep[] {
  const pool = playableWords(words);
  if (pool.length < 3) return [];
  return shuffle(pool).map((answer) => {
    const distractor = shuffle(pool.filter((w) => w.id !== answer.id))[0];
    return { answer, options: shuffle([answer, distractor]) };
  });
}
