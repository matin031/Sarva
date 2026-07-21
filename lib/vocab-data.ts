// Data for the "واژه‌یاب" picture-vocabulary game.
//
// HOW TO ADD IMAGES (for you, Matin):
//   1. Put the picture files in  public/vocab/<something>/  (any names).
//   2. Fill the `image` field of each word below with its path, e.g.
//      image: "https://raw.githubusercontent.com/ramtin1111/testPics/main/1.png"
//   The game only quizzes words whose `image` is filled, so you can add
//   pictures a few at a time — a lesson needs at least 3 pictured words to
//   be playable. Leave `image: ""` for words without a picture yet.

export type VocabWord = {
  id: string;
  word: string;
  meaning: string; // full explanation, shown after answering
  image: string; // path under /public, e.g. "/vocab/.../1.png" — empty = no picture yet
};

export type VocabLesson = {
  id: string;
  title: string;
  words: VocabWord[];
};

export type VocabGrade = {
  id: string;
  title: string;
  lessons: VocabLesson[];
};

export const VOCAB_GRADES: VocabGrade[] = [
  {
    id: "dahom",
    title: "دهم",
    lessons: [
      { id: "d1", title: "درس اول", words: [] },
      {
        id: "d2",
        title: "درس دوم",
        words: [
          {
            id: "miasa",
            word: "میاسا",
            meaning: "دست نکش",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/1.png",
          },
          {
            id: "dad",
            word: "داد",
            meaning: "عدالت",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/2.png",
          },
          {
            id: "mostaghni",
            word: "مستغنی",
            meaning: "بی‌نیاز",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/3.png",
          },
          {
            id: "timar",
            word: "تیمار",
            meaning: "پرستاری و دلسوزی",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/4.png",
          },
          {
            id: "fel",
            word: "فعل",
            meaning: "کار",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/5.png",
          },
          {
            id: "mohal",
            word: "محال",
            meaning: "غیرممکن",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/6.png",
          },
          {
            id: "zaye",
            word: "ضایع",
            meaning: "تباه",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/7.png",
          },
          {
            id: "gharabat",
            word: "قرابت",
            meaning:
              "نزدیکی، خویشی، خویشاوندی؛ در متن درس، منظور «خویشاوند» است.",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/8.png",
          },
          {
            id: "khase",
            word: "خاصه",
            meaning: "ویژه",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/9.png",
          },
          {
            id: "hormat",
            word: "حرمت",
            meaning: "احترام",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/10.png",
          },
          {
            id: "moule",
            word: "مولع",
            meaning: "حریص شدن به چیزی، بسیار مشتاق",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/11.png",
          },
          {
            id: "nang",
            word: "ننگ",
            meaning: "شرمساری",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/12.png",
          },
          {
            id: "raste",
            word: "رسته",
            meaning: "نجات یافت",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/13.png",
          },
          {
            id: "amale",
            word: "عَمَله",
            meaning: "جمع عامل، کارگران",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/14.png",
          },
          {
            id: "nemude",
            word: "نموده",
            meaning: "نشان داده، ارائه کرده، آشکار کرده",
            image:
              "https://raw.githubusercontent.com/ramtin1111/testPics/main/15.png",
          },
        ],
      },
      { id: "d3", title: "درس سوم", words: [] },
    ],
  },
  {
    id: "yazdahom",
    title: "یازدهم",
    lessons: [
      { id: "d1", title: "درس اول", words: [] },
      { id: "d2", title: "درس دوم", words: [] },
    ],
  },
  {
    id: "davazdahom",
    title: "دوازدهم",
    lessons: [
      { id: "d1", title: "درس اول", words: [] },
      { id: "d2", title: "درس دوم", words: [] },
    ],
  },
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
export function playableWords(lesson: VocabLesson): VocabWord[] {
  return lesson.words.filter((w) => w.image.trim().length > 0);
}

/** Builds one round: every pictured word becomes a question (its image +
 *  itself and two other pictured words as options), in random order. */
export function buildVocabRound(lesson: VocabLesson): VocabQuestion[] {
  const pool = playableWords(lesson);
  if (pool.length < 3) return [];
  return shuffle(pool).map((answer) => {
    const distractors = shuffle(pool.filter((w) => w.id !== answer.id)).slice(
      0,
      2,
    );
    return { answer, options: shuffle([answer, ...distractors]) };
  });
}
