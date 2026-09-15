"use client";

import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import JoinClassCard from "@/components/UI/panel/JoinClassCard";
import { jalali } from "@/lib/panel/format";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { studentLeaveClass } from "@/lib/teacher/actions";
import type { StudentClass } from "@/lib/teacher/types";

/**
 * کلاس‌های دانش‌آموز — پیوستن با کد و فهرستِ عضویت‌ها.
 *
 * ⚠️ فرمِ پیوستن **بالای** فهرست است، حتی وقتی دانش‌آموز از قبل عضوِ چند
 * کلاس باشد: کاری که آدم را به این صفحه می‌آورد، معمولاً وارد کردنِ یک کدِ
 * تازه است و نه تماشای فهرست.
 */

export default function StudentClasses({
  initial,
  inviteCode,
}: {
  initial: StudentClass[];
  /** کدی که از لینکِ دعوت آمده — فرم را از قبل پر می‌کند. */
  inviteCode?: string | null;
}) {
  const [classes, setClasses] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const leave = (classId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await studentLeaveClass(classId);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        setLeaving(null);
        return;
      }
      /* ⚠️ خروجِ خودخواسته ردیف را `removed` می‌کند و آن از فهرست بیرون
         می‌رود — بر خلافِ `blocked` که می‌ماند. پس اینجا واقعاً حذف
         می‌شود. */
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      setLeaving(null);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ⚠️ فرمِ پیوستن بالای فهرست است، حتی وقتی دانش‌آموز از قبل عضوِ چند
          کلاس باشد: کاری که آدم را به این صفحه می‌آورد، معمولاً وارد کردنِ
          یک کدِ تازه است و نه تماشای فهرست. */}
      <JoinClassCard
        initialCode={inviteCode ?? null}
        onJoined={() => {
          /* ⚠️ صفحه از نو خوانده می‌شود و فهرست دستی به‌روز نمی‌شود: اکشن
             فقط نامِ کلاس را برمی‌گرداند و نه کلِ ردیف (دبیر، مدرسه، پایه).
             ساختنِ یک ردیفِ ناقص در حافظه یعنی کارتی که تا رفرشِ بعدی نصفه
             است. */
          window.location.reload();
        }}
      />

      {error && (
        <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
          {error}
        </p>
      )}

      {classes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          هنوز عضو هیچ کلاسی نیستی.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {classes.map((klass) => (
            <Card key={klass.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Users aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{klass.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {klass.schoolName} · پایهٔ {GRADE_LABEL[klass.grade]}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      دبیر: {klass.teacherName ?? "—"} · عضو از {jalali(klass.joinedAt)}
                    </p>
                  </div>
                </div>

                {/* ⚠️ کلاسِ بایگانی‌شده از فهرست حذف نمی‌شود: دانش‌آموز
                    هنوز عضو است و دبیرش هم عملکردش را می‌بیند. پنهان کردنش
                    فقط این توهم را می‌ساخت که دیگر عضو نیست. */}
                {klass.status === "active" && !klass.isActive && (
                  <p className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                    این کلاس بایگانی شده است.
                  </p>
                )}

                {klass.status === "blocked" ? (
                  /* ⚠️ لحن. «اخراج شدی» جمله‌ای است که یک نوجوان روی صفحه
                     می‌خواند؛ این جمله همان واقعیت را می‌گوید بدونِ تحقیر.
                     و کارت می‌ماند تا بازخوردهای قبلی‌اش بی‌توضیح ناپدید
                     نشوند. */
                  <p className="rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1.5 text-[12px] text-muted-foreground">
                    عضویت شما در این کلاس پایان یافته است. دبیر دیگر عملکرد شما را نمی‌بیند.
                  </p>
                ) : leaving === klass.id ? (
                  /* تأییدِ درون‌کارتی و نه یک مودالِ جدا: تصمیم کوچک است و
                     پیامدش باید همان‌جا کنارِ نامِ کلاس خوانده شود. */
                  <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3">
                    <p className="text-[12.5px] leading-relaxed">
                      با خروج از کلاس، دبیر دیگر به عملکرد آموزشی آیندهٔ شما از طریق این
                      کلاس دسترسی نخواهد داشت. بازخوردهای قبلی شما حذف نمی‌شوند.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => leave(klass.id)}
                      >
                        {pending ? "در حال خروج…" : "خروج از کلاس"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => setLeaving(null)}
                      >
                        انصراف
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setLeaving(klass.id)}
                    className="w-full sm:w-auto"
                  >
                    خروج از کلاس
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
