import type { Metadata } from "next";
import Link from "next/link";
import { farsi3Dey1401 } from "@/lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "@/lib/exam/seed-data/farsi3-1403-kherdad";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";

export const metadata: Metadata = {
  title: "آزمون‌های آنلاین",
};

const exams: { key: string; exam: SeedExam }[] = [
  { key: "1403-kherdad", exam: farsi3Kherdad1403 },
  { key: "1401-dey", exam: farsi3Dey1401 },
];

export default function Page() {
  return (
    <div
      dir="rtl"
      className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 xs:px-5"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">آزمون‌های آنلاین</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          یکی از آزمون‌های نهایی زیر را انتخاب کنید.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {exams.map(({ key, exam }) => {
          const questionCount = exam.sections.reduce(
            (s, sec) => s + sec.questions.length,
            0,
          );
          return (
            <Link
              key={key}
              href={`/exam/${key}`}
              className="glass flex flex-col gap-3 rounded-2xl p-5 transition-colors hover:border-primary/50"
            >
              <h2 className="text-lg font-semibold">{exam.title}</h2>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {questionCount} سؤال
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {exam.totalScore} نمره
                </span>
                {exam.sections.map((section) => (
                  <span
                    key={section.title}
                    className="rounded-full bg-muted px-2.5 py-1"
                  >
                    {section.title} ({section.sectionScore})
                  </span>
                ))}
              </div>
              <span className="min-h-11 self-start rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                شروع آزمون
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
