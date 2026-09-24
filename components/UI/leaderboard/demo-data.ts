import type { LeaderboardBoard, LeaderboardEntry } from "./types";

// Fictional students and scores, for visual review only. No network or storage.
// These totals do NOT define the future cross-game scoring policy.
const students: Omit<LeaderboardEntry, "score">[] = [
  { id: "demo-1", firstName: "رها", lastName: "احمدی", city: "شیراز", school: "فرزانگان" },
  { id: "demo-2", firstName: "آرین", lastName: "محمدی", city: "تهران", school: "علامه حلی" },
  { id: "demo-3", firstName: "نیایش", lastName: "کریمی", city: "اصفهان", school: null },
  { id: "demo-4", firstName: "پارسا", lastName: "رضایی", city: "رشت", school: "شهید بهشتی" },
  { id: "demo-5", firstName: "درسا", lastName: "مرادی", city: null, school: "فرزانگان" },
  { id: "demo-6", firstName: "امیرعلی", lastName: "حسینی", city: "یزد", school: "دبیرستان امید" },
  { id: "demo-7", firstName: "باران", lastName: "نادری", city: "مشهد", school: "دبیرستان دانش" },
  { id: "demo-8", firstName: "سام", lastName: "کاظمی", city: null, school: null },
];

function demoBoard(
  id: string,
  label: string,
  description: string,
  offset: number,
): LeaderboardBoard {
  const entries = (allTime: boolean): LeaderboardEntry[] => {
    const order = allTime ? [3, 0, 5, 1, 6, 2, 7, 4] : [0, 1, 2, 3, 4, 5, 6, 7];
    const scores = allTime
      ? [24860, 23140, 21800, 20650, 19240, 18120, 16950, 15480]
      : [2840, 2610, 2480, 2310, 2180, 2050, 1940, 1820];
    return order.map((student, index) => ({
      ...students[(student + offset) % students.length],
      score: scores[index] - offset * (allTime ? 230 : 75),
    }));
  };
  return { id, label, description, scoreLabel: "امتیاز", periods: { week: entries(false), "all-time": entries(true) } };
}

export const gamesDemoBoards: readonly LeaderboardBoard[] = [
  demoBoard("overall", "همهٔ بازی‌های رقابتی", "ستاره‌های بازی‌های رقابتی سروا", 0),
  demoBoard("ninja", "نینجای دستور", "تیزترین ذهن‌ها در نینجای دستور", 1),
  demoBoard("jasoos", "جاسوس نقش‌ها", "تیزبین‌ترین کارآگاه‌های سروا", 3),
  demoBoard("pairs", "جفت‌های ادبی", "حافظه‌های درخشان در جفت‌های ادبی", 2),
  demoBoard("role-hunt", "شکار نقش‌ها", "شکارچی‌های دقیق نقش واژه‌ها", 4),
  demoBoard("aruz-rapid", "تقطیع سریع", "سریع و دقیق در دنیای هجاها", 5),
  demoBoard("aruz-bridge", "پل وزن", "قدم‌های مطمئن روی پل وزن", 6),
];

export const aruzDemoBoards: readonly LeaderboardBoard[] = [
  demoBoard("aruz", "همهٔ چالش‌های عروض", "بهترین‌های شنیدن، شناختن و ساختن وزن", 2),
  demoBoard("quiz", "عروض سماعی", "گوش‌های آشنا با موسیقی شعر", 0),
  demoBoard("aruz-rapid", "تقطیع سریع", "سریع و دقیق در دنیای هجاها", 5),
  demoBoard("aruz-bridge", "پل وزن", "قدم‌های مطمئن روی پل وزن", 6),
  demoBoard("kimia", "کیمیای وزن", "کیمیاگرهای موسیقی شعر", 1),
];
