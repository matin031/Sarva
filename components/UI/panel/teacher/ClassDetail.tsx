"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ClipboardCopy, RefreshCw } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { fa, jalali } from "@/lib/panel/format";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import {
  teacherRemoveMember,
  teacherRotateJoinCode,
  teacherSetJoinEnabled,
} from "@/lib/teacher/actions";
import type { ClassMember, TeacherClass } from "@/lib/teacher/types";

/**
 * مدیریتِ یک کلاس.
 *
 * ⚠️ هیچ‌کدام از این دکمه‌ها به‌تنهایی دفاع نیستند — هر اکشنی که صدا
 * می‌زنند، خودش `requireTeacher()` و گاردِ مالکیت دارد. دلیلش بالای
 * `lib/teacher/actions.ts` است: یک Server Action در عمل یک endpoint شبکه
 * است و «این دکمه فقط برای مالک رندر می‌شود» هیچ چیزی را نمی‌بندد.
 */

export default function ClassDetail({
  klass,
  initialMembers,
}: {
  klass: TeacherClass;
  initialMembers: ClassMember[];
}) {
  const [joinCode, setJoinCode] = useState(klass.joinCode);
  /* ⚠️ این کلید به `join_enabled` وصل است و نه `is_active`.
  
     تا مهاجرت ۰۱۴ یک ستون بودند و همین دکمه `is_active` را عوض می‌کرد —
     در حالی که متنش («کسی نمی‌تواند عضو شود، اعضای فعلی سرِ جایشان
     هستند») دقیقاً `join_enabled` را توصیف می‌کرد. حالا هر دو یک چیز
     می‌گویند و بایگانیِ کلاس یک اقدامِ جداست. */
  const [joinOpen, setJoinOpen] = useState(klass.joinEnabled);
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = members.filter((m) => m.status === "active");

  const run = (action: () => Promise<{ ok: boolean; errors?: string[] }>, after: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.errors?.join("\n") ?? "انجام نشد.");
        return;
      }
      after();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── کد عضویت ────────────────────────────────────────────────── */}
      <Card data-tone="gold">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="font-bold">کد عضویت کلاس</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              این کد را به دانش‌آموزانت بده تا در پنل خودشان وارد کنند. هر کسی که کد را داشته
              باشد می‌تواند عضو شود، پس اگر جایی پخش شد کد تازه بگیر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CopyableCode code={joinCode} />
            {/* ⚠️ این یکی از helperِ `run` استفاده نمی‌کند: کدِ تازه در
                *پاسخِ* اکشن می‌آید و باید همان لحظه روی صفحه بنشیند. `run`
                فقط موفقیت/شکست را می‌داند و مقدارِ بازگشتی را دور می‌ریزد —
                یعنی دبیر تا رفرشِ بعدی همان کدِ سوخته را می‌دید و به کلاس
                می‌داد. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await teacherRotateJoinCode(klass.id);
                  if (!result.ok) {
                    setError(result.errors.join("\n"));
                    return;
                  }
                  setJoinCode(result.data.joinCode);
                });
              }}
            >
              <RefreshCw aria-hidden />
              کد تازه
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── عضوگیری ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">
              {joinOpen ? "عضوگیری باز است" : "عضوگیری بسته است"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {joinOpen
                ? "دانش‌آموزان تازه می‌توانند با کد عضو شوند."
                : "کسی نمی‌تواند با کد عضو شود. اعضای فعلی سرِ جایشان هستند و عملکردشان را می‌بینی."}
            </p>
          </div>
          <Button
            type="button"
            variant={joinOpen ? "outline" : "default"}
            size="sm"
            disabled={pending}
            aria-pressed={!joinOpen}
            onClick={() =>
              run(
                () => teacherSetJoinEnabled(klass.id, !joinOpen),
                () => setJoinOpen((v) => !v),
              )
            }
          >
            {joinOpen ? "بستن عضوگیری" : "باز کردن عضوگیری"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="whitespace-pre-line rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {error}
        </p>
      )}

      {/* ── اعضا ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-bold">
            دانش‌آموزان <span className="text-muted-foreground">({fa(active.length)})</span>
          </h2>

          {active.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              هنوز کسی عضو نشده. کد عضویت را به دانش‌آموزانت بده.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {active.map((member) => (
                <li
                  key={member.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    {/* ⚠️ نامِ نمایشی ممکن است null باشد — کاربری که هنوز
                        پروفایلش را کامل نکرده. نوشتنِ «بدون نام» بهتر از
                        یک ردیفِ خالی است که شبیهِ باگ به نظر می‌رسد. */}
                    <p className="truncate font-medium">{member.fullName ?? "بدون نام"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {member.grade ? `پایهٔ ${GRADE_LABEL[member.grade]} · ` : ""}
                      عضو از {jalali(member.joinedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/panel/teacher/class/${klass.id}/student/${member.studentId}`}>
                        عملکرد
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => teacherRemoveMember(klass.id, member.studentId),
                          () =>
                            setMembers((prev) =>
                              prev.map((m) =>
                                m.studentId === member.studentId
                                  /* ⚠️ `blocked` و نه `removed`: از مهاجرت ۰۱۴ به
                                     بعد، بیرون گذاشتنِ دبیر یعنی بلاک — و
                                     همان چیزی است که سرور نوشته. */
                                  ? { ...m, status: "blocked" as const }
                                  : m,
                              ),
                            ),
                        )
                      }
                    >
                      حذف
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        // بافتِ ناامن (http روی IP محلی) اصلاً `clipboard` ندارد؛ کد روی
        // صفحه هست و دستی هم می‌شود برداشت.
        navigator.clipboard
          ?.writeText(code)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-4 py-2 font-mono text-lg tracking-[0.3em] transition-colors hover:border-muted-foreground/50"
      aria-label={`کپی کد عضویت ${code}`}
    >
      <span dir="ltr">{code}</span>
      <ClipboardCopy aria-hidden className="size-4 text-muted-foreground" />
      {copied && <span className="font-sans text-xs text-primary">کپی شد</span>}
    </button>
  );
}
