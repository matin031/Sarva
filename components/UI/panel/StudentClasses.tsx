"use client";

import { useState, useTransition } from "react";
import { LogIn, Users } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { jalali } from "@/lib/panel/format";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { studentJoinClass, studentLeaveClass } from "@/lib/teacher/actions";
import type { StudentClass } from "@/lib/teacher/types";
import styles from "./panel-design.module.css";

/**
 * کلاس‌های دانش‌آموز — پیوستن با کد و فهرستِ عضویت‌ها.
 *
 * ⚠️ فرمِ پیوستن **بالای** فهرست است، حتی وقتی دانش‌آموز از قبل عضوِ چند
 * کلاس باشد: کاری که آدم را به این صفحه می‌آورد، معمولاً وارد کردنِ یک کدِ
 * تازه است و نه تماشای فهرست.
 */

export default function StudentClasses({ initial }: { initial: StudentClass[] }) {
  const [classes, setClasses] = useState(initial);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const join = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await studentJoinClass(code);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }

      setCode("");
      setMessage(`به کلاس «${result.data.className}» اضافه شدی.`);

      /* ⚠️ صفحه دوباره بارگذاری می‌شود و فهرست دستی به‌روز نمی‌شود.
         اکشن فقط نامِ کلاس را برمی‌گرداند و نه کلِ ردیف (نامِ دبیر، مدرسه،
         پایه). ساختنِ یک ردیفِ ناقص در حافظه یعنی کارتی که تا رفرشِ بعدی
         نصفه است؛ `revalidatePath` در خودِ اکشن، دادهٔ کامل را می‌آورد. */
      window.location.reload();
    });
  };

  const leave = (classId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await studentLeaveClass(classId);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card data-tone="mint">
        <div className={styles.formIntro}>
          <span className={styles.sticker}>
            <LogIn aria-hidden className="size-5" />
          </span>
          <div>
            <h2>پیوستن به کلاس</h2>
            <p>کدی که دبیرت داده را اینجا وارد کن.</p>
          </div>
        </div>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="کد عضویت" htmlFor="join-code" className="flex-1">
              <Input
                id="join-code"
                dir="ltr"
                value={code}
                placeholder="AB3K9P"
                autoComplete="off"
                onChange={(e) => setCode(e.target.value)}
                className="text-center font-mono tracking-[0.3em] uppercase"
              />
            </Field>
            <Button
              type="button"
              disabled={pending || code.trim().length < 6}
              onClick={join}
            >
              {pending ? "در حال بررسی…" : "پیوستن"}
            </Button>
          </div>

          {message && <p className="text-[13px] text-primary">{message}</p>}
          {error && (
            <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

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

                {/* ⚠️ کلاسِ بسته از فهرست حذف نمی‌شود: دانش‌آموز هنوز عضو
                    است و دبیرش هم عملکردش را می‌بیند. پنهان کردنش فقط این
                    توهم را می‌ساخت که دیگر عضو نیست. */}
                {!klass.isActive && (
                  <p className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                    این کلاس بسته شده است.
                  </p>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => leave(klass.id)}
                  className="w-full sm:w-auto"
                >
                  خروج از کلاس
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
