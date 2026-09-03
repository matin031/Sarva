/** شکلِ نتیجهٔ تصحیح — جدا از `app/exam/[examKey]/actions.ts` چون آن فایل
 *  `"use server"` است و فقط اجازهٔ export تابع async دارد؛ یک `type` آنجا
 *  خطای زمانِ build می‌دهد (و tsc آن را نمی‌گیرد). */
export type PartResult = {
  label?: string;
  score: number;
  maxScore: number;
  status: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText: string;
  feedback?: string;
  selfGrade?: boolean;
};

export type QuestionResult = {
  number: number;
  parts: PartResult[];
};
