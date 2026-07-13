import PanelStats from "@/components/PanelStats";
import AccountSettings from "@/components/UI/AccountSettings";
import ProgressChart from "@/components/UI/ChartPanel";
import ExitPanelBtn from "@/components/UI/ExitPanelBtn";
import { createServerClient } from "@supabase/ssr";
import { LoadingBoundaryProvider } from "next/dist/client/components/layout-router";
import { cookies } from "next/headers";
import Link from "next/link";
import CompletedQuizzesSection, {
  type Attempt,
} from "@/components/CompletedQuizzesSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "پنل کاربری",
  robots: { index: false, follow: false },
};

async function page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fullName = user?.user_metadata?.full_name ?? "کاربر";

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select(
      `
    id,
    total,
    correct,
    created_at,
    quiz_attempt_answers (
      id,
      is_correct,
      selected_option_id,
      questions (
        id,
        type,
        poem,
        audio_url,
        question_options (
          id,
          label,
          poem,
          audio_url,
          is_correct,
          x
        )
      )
    )
  `,
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: stats } = await supabase
    .from("user_answers")
    .select("is_correct")
    .eq("user_id", user!.id);

  const totalAnswers = stats?.length ?? 0;
  const correctAnswers = stats?.filter((s) => s.is_correct).length ?? 0;
  const wrongAnswersCount = totalAnswers - correctAnswers;

  const { data: chartData } = await supabase
    .from("user_answers")
    .select("is_correct, answered_at")
    .eq("user_id", user!.id)
    .gte(
      "answered_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const TEHRAN_TZ = "Asia/Tehran";

  // YYYY-MM-DD key for a date, computed in Tehran local time — used to
  // bucket answers by their actual calendar day rather than by weekday
  // name (which would merge "today" with "the same weekday last week").
  const tehranDateKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TEHRAN_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const tehranWeekdayLabel = (date: Date) =>
    new Intl.DateTimeFormat("fa-IR", {
      timeZone: TEHRAN_TZ,
      weekday: "long",
    }).format(date);

  // the last 7 actual calendar days (Tehran time), oldest first, ending today
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (6 - idx));
    return d;
  });

  const progressData = last7Days.map((date) => {
    const key = tehranDateKey(date);
    const dayAnswers =
      chartData?.filter(
        (a) => tehranDateKey(new Date(a.answered_at)) === key,
      ) ?? [];
    const correct = dayAnswers.filter((a) => a.is_correct).length;
    const total = dayAnswers.length;
    return {
      day: tehranWeekdayLabel(date),
      value: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });
  const formatJalaliDate = (iso: string) => {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
      timeZone: TEHRAN_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso));
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}/${get("month")}/${get("day")}`;
  };

  const attemptsWithDate = (attempts ?? []).map((a: any) => ({
    ...a,
    formattedDate: formatJalaliDate(a.created_at),
  })) as Attempt[];

  return (
    <main dir="rtl" className=" mt-10 container">
      <div className=" flex sm:flex-row flex-col items-center gap-y-5 sm:items-end justify-center sm:justify-between">
        <div className=" cursor-default flex items-center sm:items-start flex-col">
          <span className=" text-muted-foreground">پنل کاربری</span>
          <div className=" text-3xl gap-x-2 flex items-center">
            <span>درود،</span>
            <h1>{fullName}</h1>
          </div>
          <p className=" text-muted-foreground">
            بیا امروز هم چند بیت را وزن‌یابی کنیم.
          </p>
        </div>
        <div className=" space-x-3">
          <Link
            className=" relative z-20  group  items-center inline-flex px-5 py-3 rounded-xl gap-x-2 font-bold 
          brightness-90 hover:brightness-100 transition-all  glass shadow"
            href={"/quiz"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 group-hover:translate-x-0.5 transition-all"
            >
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
            آغاز آزمون جدید
          </Link>
        </div>
      </div>
      <PanelStats
        total={totalAnswers}
        correct={correctAnswers}
        wrong={wrongAnswersCount}
      />
      <h5 className="font-bold text-xl xs:text-2xl mt-10 mb-3 gap-x-2 flex items-center cursor-default">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-6 xs:size-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
          />
        </svg>
        نمودار پیشرفت
      </h5>
      <div className=" glass relative z-20 rounded-xl p-6 ">
        <div className=" flex items-center justify-between">
          <div>
            <span className=" text-muted-foreground text-sm">
              درصد پاسخ درست در هفتهٔ اخیر
            </span>
          </div>
          <div className=" flex items-center gap-x-2">
            <div className=" size-3 bg-primary rounded "></div>
            <span className=" text-sm text-muted-foreground">دقت</span>
          </div>
        </div>
        <ProgressChart data={progressData} />
      </div>

      <h5 className="font-bold text-xl xs:text-2xl mt-10 mb-3 gap-x-2 flex items-center cursor-default">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-6 xs:size-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12"
          />
        </svg>
        آزمون‌های انجام‌شده
      </h5>
      <CompletedQuizzesSection attempts={attemptsWithDate} />
      <h5 className="font-bold text-xl xs:text-2xl mt-10 mb-3 gap-x-2 flex items-center cursor-default">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-6 xs:size-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
        تنظیمات حساب کاربری
      </h5>
      <AccountSettings />
      <ExitPanelBtn />
    </main>
  );
}

export default page;
