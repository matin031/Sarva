import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import { clock, fa, jalali } from "@/lib/panel/format";
import {
  getStudentBridgeSessions,
  getStudentVocabSessions,
  type BridgeSession,
  type VocabSession,
} from "@/lib/teacher/student-detail";
import { cn } from "@/lib/cn";

/**
 * فعالیتِ یک بازی، نشست‌به‌نشست — از دیدِ دبیر.
 *
 * =============================================================================
 * ⚠️ چرا **یک** صفحه برای دو بازی و نه دو صفحه
 * =============================================================================
 *
 * پلِ وزن و واژه‌یاب داده‌های متفاوتی دارند (یکی الگوی وزنی، دیگری واژه و
 * معنی) ولی *شکلِ* صفحه‌شان یکی است: فهرستی از نشست‌ها، هر نشست با دقتش، و
 * زیرش پاسخ‌های همان نشست.
 *
 * دو صفحهٔ جدا یعنی دو نسخه از همان اسکلت — و اولین تغییری که فقط در یکی
 * اعمال شود، آن دو را از هم جدا می‌کند. تفاوتشان فقط در ردیف‌هاست و همان
 * یک تفاوت هم در `AnswerRow` جمع شده.
 *
 * ⚠️ `game` از نوارِ آدرس می‌آید و **در برابر یک فهرستِ بسته** سنجیده
 * می‌شود. اگر با آن یک نامِ جدول ساخته می‌شد، همین‌جا یک تزریقِ SQL بود؛
 * اینجا هر چیزی جز دو مقدارِ مجاز یک ۴۰۴ ساده است.
 */

/** بازی‌هایی که تاریخچهٔ قابلِ نمایش دارند. */
const GAMES = {
  "aruz-bridge": {
    title: "پل وزن",
    /* ⚠️ همان جمله‌ای که صفحهٔ عملکرد هم می‌گوید: این بازی را سرور تصحیح
       می‌کند، پس درصدش قابلِ اتکاست. */
    note: "پاسخ‌ها را سرور تصحیح کرده است.",
  },
  vocab: {
    title: "واژه‌یاب",
    /* ⚠️ این یکی نه. درستی را خودِ بازی در مرورگر تعیین و ارسال می‌کند، و
       دبیر باید پیش از تفسیرِ عدد این را بداند — همان برچسبی که در فهرستِ
       بازی‌های صفحهٔ عملکرد هم هست. */
    note: "درستیِ پاسخ‌ها را خودِ بازی گزارش کرده و سرور دوباره تصحیحشان نکرده است.",
  },
} as const;

type GameKey = keyof typeof GAMES;

function isGameKey(value: string): value is GameKey {
  return Object.hasOwn(GAMES, value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  return {
    title: isGameKey(game) ? `فعالیت ${GAMES[game].title}` : "فعالیت بازی",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; studentId: string; game: string }>;
}) {
  const { classId, studentId, game } = await params;

  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) redirect(err.status === 401 ? "/auth" : "/panel/teacher");
    throw err;
  }

  if (!isUuid(classId) || !isUuid(studentId) || !isGameKey(game)) notFound();

  const sessions =
    game === "aruz-bridge"
      ? await getStudentBridgeSessions(teacher.id, studentId, classId)
      : await getStudentVocabSessions(teacher.id, studentId, classId);

  /* `null` یعنی گارد رد کرد — همان ۴۰۴ی که «وجود ندارد» و «مالِ تو نیست»
     را از هم جدا نمی‌کند. آرایهٔ خالی یعنی دسترسی هست و بازی نکرده. */
  if (sessions === null) notFound();

  const meta = GAMES[game];
  const backHref = `/panel/teacher/class/${classId}/student/${studentId}`;

  const totalAnswers = sessions.reduce((n, s) => n + s.total, 0);
  const totalCorrect = sessions.reduce((n, s) => n + s.correct, 0);

  return (
    <>
      <PanelPageHeader
        title={meta.title}
        description={meta.note}
        eyebrow="فعالیت دانش‌آموز"
        tone="lilac"
        art={false}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>بازگشت به عملکرد</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="نشست‌ها" value={fa(sessions.length)} />
          <Stat label="پاسخ‌ها" value={fa(totalAnswers)} />
          <Stat
            label="درست"
            value={
              totalAnswers === 0
                ? "—"
                : `${fa(totalCorrect)} (${fa(Math.round((totalCorrect / totalAnswers) * 100))}٪)`
            }
          />
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-[13px] text-muted-foreground">
              هنوز این بازی را انجام نداده است.
            </CardContent>
          </Card>
        ) : (
          <ol className="flex flex-col gap-3">
            {sessions.map((session, index) => (
              <li key={session.endedAt}>
                <SessionCard
                  game={game}
                  session={session}
                  /* ⚠️ شماره از **آخر** می‌آید: فهرست تازه‌ترین-اول است و
                     دبیر باید بداند این نشستِ چندمِ دانش‌آموز بوده، نه
                     چندمین ردیفِ صفحه. */
                  number={sessions.length - index}
                />
              </li>
            ))}
          </ol>
        )}

        {/* ⚠️ سقفِ خواندن صریح اعلام می‌شود.

            `getStudent*Sessions` چهارصد پاسخِ اخیر را می‌آورد. بدونِ این
            جمله، دبیرِ یک دانش‌آموزِ پرکار فکر می‌کرد او فقط همین‌قدر بازی
            کرده — یعنی صفحه بی‌صدا دروغ می‌گفت. */}
        {totalAnswers >= 400 && (
          <p className="text-center text-[12px] text-muted-foreground">
            فقط {fa(400)} پاسخِ اخیر نشان داده می‌شود؛ این دانش‌آموز بیشتر از این بازی کرده است.
          </p>
        )}
      </div>
    </>
  );
}

function SessionCard({
  game,
  session,
  number,
}: {
  game: GameKey;
  session: BridgeSession | VocabSession;
  number: number;
}) {
  const percent = session.accuracy === null ? null : Math.round(session.accuracy * 100);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[13px] font-bold">
            نشست {fa(number)}
            <span className="ms-2 font-normal text-muted-foreground">
              {jalali(session.startedAt)}
              {/* ⚠️ ساعتِ شروع و پایان: «۲۰ دقیقه بازی کرد» و «دو پاسخ در
                  دو روز» هر دو می‌توانند «۲ پاسخ» باشند. */}
              <span className="panel-num ms-1">
                {clock(session.startedAt)}–{clock(session.endedAt)}
              </span>
            </span>
          </h2>
          <span className="panel-num text-[13px] font-bold">
            {fa(session.correct)} از {fa(session.total)}
            {percent !== null && (
              <span className="ms-2 font-normal text-muted-foreground">{fa(percent)}٪</span>
            )}
            {/* ⚠️ `accuracy === null` یعنی «شواهد کافی نیست» و نه صفر —
                همان قاعده‌ای که کلِ تحلیل‌های پنل رعایت می‌کنند. */}
            {percent === null && (
              <span className="ms-2 font-normal text-muted-foreground">داده کافی نیست</span>
            )}
          </span>
        </div>

        <ul className="flex flex-col divide-y divide-border/60">
          {session.answers.map((answer) => (
            <AnswerRow key={answer.id} game={game} answer={answer} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnswerRow({
  game,
  answer,
}: {
  game: GameKey;
  answer: BridgeSession["answers"][number] | VocabSession["answers"][number];
}) {
  return (
    <li className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {/* ⚠️ علامت هم شکل دارد و هم رنگ. تشخیصِ سبز از قرمز برای بخشی از
          کاربران ممکن نیست، و این صفحه ممکن است چاپ هم بشود. */}
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
          answer.isCorrect
            ? "bg-primary/12 text-primary"
            : "bg-destructive/12 text-destructive",
        )}
      >
        {answer.isCorrect ? "✓" : "✕"}
      </span>
      <span className="sr-only">{answer.isCorrect ? "درست" : "نادرست"}</span>

      {"phrase" in answer ? <BridgeBody answer={answer} /> : <VocabBody answer={answer} />}

      <time
        dateTime={answer.answeredAt}
        title={jalali(answer.answeredAt)}
        className="panel-num shrink-0 text-[11px] text-muted-foreground"
      >
        {clock(answer.answeredAt)}
      </time>

      {/* بازی در props هست تا اگر روزی ردیفِ سومی اضافه شد، جای شاخه‌زدن
          معلوم باشد. امروز خودِ شکلِ داده کافی است. */}
      <span className="sr-only">{GAMES[game].title}</span>
    </li>
  );
}

function BridgeBody({ answer }: { answer: BridgeSession["answers"][number] }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] leading-relaxed">{answer.phrase}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
        <span>
          درست: <bdi className="panel-num">{answer.correctPattern}</bdi>
        </span>
        {/* ⚠️ فقط وقتی انتخابش با پاسخِ درست فرق دارد نوشته می‌شود.
            تکرارِ همان الگو کنارِ یک تیکِ سبز، فقط ردیف را شلوغ می‌کند. */}
        {!answer.isCorrect && (
          <span>
            انتخاب:{" "}
            {answer.chosenPattern ? (
              <bdi className="panel-num">{answer.chosenPattern}</bdi>
            ) : (
              /* ⚠️ `null` یعنی وقت تمام شد و اصلاً انتخابی نکرد — که با
                 «اشتباه انتخاب کرد» یکی نیست و برای دبیر معنیِ دیگری
                 دارد. */
              <span>وقت تمام شد</span>
            )}
          </span>
        )}
      </p>
    </div>
  );
}

function VocabBody({ answer }: { answer: VocabSession["answers"][number] }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">{answer.word}</span>
        {answer.meaning && <span className="text-muted-foreground"> — {answer.meaning}</span>}
      </p>
      {(answer.grade || answer.lesson !== null) && (
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {answer.grade}
          {answer.lesson !== null && <span className="panel-num"> · درس {fa(answer.lesson)}</span>}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="panel-num text-lg font-extrabold">{value}</span>
      </CardContent>
    </Card>
  );
}
