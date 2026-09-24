import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa, relativeDay } from "@/lib/panel/format";
import { ATTENTION_LABEL } from "@/lib/teacher/analytics-rules";
import type { ClassDashboard } from "@/lib/teacher/analytics";

/**
 * نمای تحلیلیِ یک کلاس.
 *
 * =============================================================================
 * ⚠️ قاعده‌ای که این کامپوننت رعایت می‌کند
 * =============================================================================
 *
 * **هیچ‌جا «۰٪» نوشته نمی‌شود مگر واقعاً صفر باشد.**
 *
 * `accuracy` از سرور یا یک عدد است یا `null`، و `null` یعنی «هنوز داده کافی
 * نداریم». نوشتنِ «۰٪ ضعیف» کنارِ نامِ دانش‌آموزی که دیروز عضو شده، یک
 * قضاوتِ ساختگی است دربارهٔ یک نوجوانِ واقعی — و دبیری که آن را ببیند،
 * ممکن است بر اساسش با او حرف بزند.
 *
 * ⚠️ و «نیازمندِ توجه» هیچ امتیازِ عددی ندارد: هر مورد جملهٔ خودش را
 * می‌آورد («بیش از ۱۴ روز است فعالیتی ثبت نشده»). دبیر باید بتواند بپرسد
 * «چرا؟» و جوابش همان‌جا نوشته باشد.
 */
export default function ClassAnalytics({ dashboard }: { dashboard: ClassDashboard }) {
  const needAttention = dashboard.students.filter((s) => s.attention.length > 0);
  const measuredPercent = Math.round(dashboard.measuredRatio * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* ── سرشماری ─────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="دانش‌آموزان" value={fa(dashboard.studentCount)} />
        <Stat
          label="دارای داده کافی برای تحلیل"
          value={`${fa(measuredPercent)}٪`}
          hint={`${fa(dashboard.students.filter((s) => s.accuracy !== null).length)} نفر از ${fa(dashboard.students.length)}`}
        />
        <Stat label="نیازمند توجه" value={fa(needAttention.length)} />
      </div>

      {/* ── نیازمندِ توجه ────────────────────────────────────────────── */}
      {needAttention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نیازمند توجه</CardTitle>
            <CardDescription>
              بدون امتیاز و رتبه‌بندی.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {needAttention.map((s) => (
                <li key={s.studentId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/panel/teacher/class/${dashboard.classId}/student/${s.studentId}`}
                    className="font-medium text-primary underline-offset-[6px] hover:underline"
                  >
                    {s.fullName ?? "دانش‌آموز بدون نام"}
                  </Link>
                  <ul className="text-[13px] text-muted-foreground">
                    {s.attention.map((reason) => (
                      <li key={reason}>• {ATTENTION_LABEL[reason]}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── فهرستِ دانش‌آموزان ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>دانش‌آموزان</CardTitle>
          <CardDescription>
            «فعالیت» یعنی پاسخ‌های ثبت‌شده در تمرین‌ها و بازی‌ها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز کسی به این کلاس نپیوسته است.
            </p>
          ) : (
            /* ⚠️ جدول داخلِ یک ظرفِ اسکرول‌شونده: روی گوشی ستون‌ها جا
               نمی‌شوند و بدونِ این، کلِ صفحه افقی اسکرول می‌شود. */
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted-foreground">
                    <th className="py-2 font-medium">نام</th>
                    <th className="py-2 font-medium">آخرین فعالیت</th>
                    <th className="py-2 font-medium">فعالیت</th>
                    <th className="py-2 font-medium">درصد موفقیت</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.students.map((s) => (
                    <tr key={s.studentId} className="border-b border-border/60 last:border-0">
                      <td className="py-3">
                        <Link
                          href={`/panel/teacher/class/${dashboard.classId}/student/${s.studentId}`}
                          className="font-medium text-primary underline-offset-[6px] hover:underline"
                        >
                          {s.fullName ?? "دانش‌آموز بدون نام"}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {s.lastActivityAt ? relativeDay(s.lastActivityAt) : "—"}
                      </td>
                      <td className="panel-num py-3 text-muted-foreground">
                        {fa(s.answerCount)}
                      </td>
                      <td className="py-3">
                        {/* ⚠️ اینجا و فقط اینجا: `null` هرگز «۰٪» نمی‌شود. */}
                        {s.accuracy === null ? (
                          <span className="text-[13px] text-muted-foreground">
                            داده کافی نیست
                          </span>
                        ) : (
                          <span className="panel-num font-semibold">
                            {fa(Math.round(s.accuracy * 100))}٪
                            <span className="ms-1 text-[11px] font-normal text-muted-foreground">
                              از {fa(s.verifiedTotal)} پاسخ سنجیده‌شده
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dashboard.hasMore && (
            <p className="pt-4 text-center text-[13px] text-muted-foreground">
              فقط {fa(dashboard.students.length)} نفر اول نمایش داده شده است.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="panel-num text-xl font-extrabold">{value}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
