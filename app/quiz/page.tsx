import Quiz from "@/components/UI/Quiz";
import { query } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "آزمون وزن شعر",
  robots: { index: false, follow: false },
};

/** سؤال‌ها از دیتابیس می‌آیند و مدیر هر لحظه می‌تواند عوضشان کند، پس این صفحه
 *  نباید در زمان build پخته شود.
 *
 *  تا دیروز این خط لازم نبود: صفحه از cookies() استفاده می‌کرد (برای ساختن
 *  کلاینت Supabase) و همان به‌تنهایی Next را وادار می‌کرد پویا رندرش کند. با
 *  حذف آن وابستگی، صفحه ناگهان کاندید پیش‌رندر شد و build با
 *  «DATABASE_URL تنظیم نشده» شکست — چون مرحلهٔ build دیتابیس ندارد. */
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  poem: string[] | null;
  audio_url: string | null;
  option_id: string | null;
  option_label: string | null;
  option_poem: string[] | null;
  option_audio_url: string | null;
  option_is_correct: boolean | null;
  option_x: number | null;
};

async function page() {
  // یک JOIN به‌جای کوئری تودرتوی PostgREST. ترتیب گزینه‌ها با x و بعد id
  // تثبیت شده تا چیدمان بین بارگذاری‌ها نپرد — قبلاً ترتیبی تعریف نشده بود و
  // به هرچه دیتابیس برمی‌گرداند وابسته بود.
  const rows = await query<Row>(
    `select q.id, q.type, q.poem, q.audio_url,
            o.id as option_id, o.label as option_label, o.poem as option_poem,
            o.audio_url as option_audio_url, o.is_correct as option_is_correct, o.x as option_x
       from questions q
       left join question_options o on o.question_id = q.id
      order by q.created_at, q.id, o.x, o.id`,
  );

  const byQuestion = new Map<string, Question>();

  for (const r of rows) {
    let question = byQuestion.get(r.id);
    if (!question) {
      question = {
        id: r.id,
        type: r.type as Question["type"],
        poem: r.poem ?? undefined,
        audioSrc: r.audio_url ?? undefined,
        options: [],
      };
      byQuestion.set(r.id, question);
    }

    // left join یعنی سؤالِ بی‌گزینه هم یک ردیف با ستون‌های null می‌دهد؛
    // نباید به یک گزینهٔ خالی تبدیل شود.
    if (r.option_id) {
      question.options.push({
        id: r.option_id,
        label: r.option_label ?? undefined,
        poem: r.option_poem ?? undefined,
        audioSrc: r.option_audio_url ?? undefined,
        isCorrect: r.option_is_correct ?? false,
        x: r.option_x ?? 30,
      });
    }
  }

  return <Quiz data={[...byQuestion.values()]} />;
}

export type Question = {
  id: string;
  type:
    | "audio-to-poem"
    | "audio-to-pattern"
    | "poem-to-audio"
    | "pattern-to-audio"
    | "audio-to-weight"
    | "weight-to-audio";
  poem?: string[];
  audioSrc?: string;
  options: {
    id: string;
    poem?: string[];
    label?: string;
    audioSrc?: string;
    isCorrect: boolean;
    x: number;
  }[];
};

export default page;
