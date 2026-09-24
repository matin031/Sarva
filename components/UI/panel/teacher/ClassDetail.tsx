"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import InvitePanel from "@/components/UI/panel/teacher/InvitePanel";
import { fa, jalali } from "@/lib/panel/format";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import {
  teacherAllowRejoin,
  teacherRemoveMember,
  teacherSetClassActive,
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
  qrSvg,
}: {
  klass: TeacherClass;
  initialMembers: ClassMember[];
  /** QRِ لینکِ دعوت — سمتِ سرور ساخته شده. */
  qrSvg: string;
}) {
  /* ⚠️ این کلید به `join_enabled` وصل است و نه `is_active`.
  
     تا مهاجرت ۰۱۴ یک ستون بودند و همین دکمه `is_active` را عوض می‌کرد —
     در حالی که متنش («کسی نمی‌تواند عضو شود، اعضای فعلی سرِ جایشان
     هستند») دقیقاً `join_enabled` را توصیف می‌کرد. حالا هر دو یک چیز
     می‌گویند و بایگانیِ کلاس یک اقدامِ جداست. */
  const [joinOpen, setJoinOpen] = useState(klass.joinEnabled);
  const [isActive, setIsActive] = useState(klass.isActive);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  /** شناسهٔ دانش‌آموزی که دبیر روی «خارج کردن»ش زده و هنوز تأیید نکرده. */
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = members.filter((m) => m.status === "active");
  /* ⚠️ خارج‌شده‌ها جدا نشان داده می‌شوند و نه قاطیِ اعضا: تنها کاری که
     دبیر با آن‌ها دارد «اجازهٔ بازگشت» است، و بودنشان وسطِ فهرست فقط
     شمارشِ کلاس را گیج می‌کرد. */
  const blocked = members.filter((m) => m.status === "blocked");

  const needle = search.trim().toLowerCase();
  const shown = needle
    ? active.filter((m) => (m.fullName ?? "").toLowerCase().includes(needle))
    : active;

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
      <InvitePanel classId={klass.id} initialCode={klass.joinCode} initialQr={qrSvg} />

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
                : "کسی نمی‌تواند با کد عضو شود. اعضای فعلی سر جایشان هستند و عملکردشان را می‌بینی."}
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

      {/* ── بایگانی ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">{isActive ? "کلاس فعال است" : "کلاس بایگانی شده"}</h2>
              {/* ⚠️ معنای بایگانی صریح نوشته می‌شود، چون از «بستنِ
                  عضوگیری» بالا به‌سختی قابلِ تشخیص است — و تا مهاجرت ۰۱۴
                  واقعاً یک چیز بودند. */}
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {isActive
                  ? "برای پایان ترم، کلاس را بایگانی کن. اعضا و عملکردشان می‌مانند و همچنان می‌توانی ببینی‌شان؛ فقط عضو تازه‌ای وارد نمی‌شود."
                  : "عضو تازه‌ای وارد نمی‌شود. اعضا و عملکردشان سر جایشان هستند."}
              </p>
            </div>

            {!confirmArchive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  isActive
                    ? setConfirmArchive(true)
                    : run(
                        () => teacherSetClassActive(klass.id, true),
                        () => setIsActive(true),
                      )
                }
              >
                {isActive ? "بایگانی کلاس" : "فعال کردن دوباره"}
              </Button>
            )}
          </div>

          {confirmArchive && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-foreground/[0.03] p-3">
              <p className="text-[12.5px] leading-relaxed">
                کلاس بایگانی می‌شود: هیچ دانش‌آموزی حذف نمی‌شود، بازخوردها و عملکردها
                می‌مانند و همچنان می‌توانی ببینی‌شان. فقط کسی نمی‌تواند عضو تازه شود.
                هر وقت خواستی دوباره فعالش کن.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => teacherSetClassActive(klass.id, false),
                      () => {
                        setIsActive(false);
                        setConfirmArchive(false);
                      },
                    )
                  }
                >
                  {pending ? "در حال بایگانی…" : "بایگانی کن"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirmArchive(false)}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              دانش‌آموزان <span className="text-muted-foreground">({fa(active.length)})</span>
            </h2>

            {/* ⚠️ جست‌وجو فقط وقتی می‌آید که واقعاً لازم باشد. در کلاسِ
                هشت‌نفره یک فیلدِ خالی فقط شلوغی است؛ در کلاسِ چهل‌نفره
                تنها راهِ پیدا کردنِ یک نفر است. */}
            {active.length > 12 && (
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جست‌وجوی نام…"
                aria-label="جست‌وجو در دانش‌آموزان"
                className="w-full rounded-xl border border-border bg-transparent px-3 py-1.5 text-[13px] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
              />
            )}
          </div>

          {active.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              هنوز کسی عضو نشده. کد یا لینک دعوت را به دانش‌آموزانت بده.
            </p>
          ) : shown.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted-foreground">
              دانش‌آموزی با این نام پیدا نشد.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {shown.map((member) => (
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

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/panel/teacher/class/${klass.id}/student/${member.studentId}`}>
                        عملکرد
                      </Link>
                    </Button>

                    {removing === member.studentId ? (
                      /* ⚠️ تأییدِ درون‌ردیفی: «حذف» پیامدِ واقعی دارد
                         (دانش‌آموز اعلان می‌گیرد و تا اجازهٔ دبیر برنمی‌گردد)
                         و نباید با یک کلیکِ تصادفی انجام شود. */
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className="text-muted-foreground">مطمئنی؟</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => teacherRemoveMember(klass.id, member.studentId),
                              () => {
                                setMembers((prev) =>
                                  prev.map((m) =>
                                    m.studentId === member.studentId
                                      ? /* ⚠️ `blocked` و نه `removed`: از
                                           مهاجرت ۰۱۴ به بعد، بیرون گذاشتنِ
                                           دبیر یعنی بلاک — همان چیزی که
                                           سرور نوشته. */
                                        { ...m, status: "blocked" as const }
                                      : m,
                                  ),
                                );
                                setRemoving(null);
                              },
                            )
                          }
                        >
                          بله
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setRemoving(null)}
                        >
                          نه
                        </Button>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => setRemoving(member.studentId)}
                      >
                        خارج کردن
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── خارج‌شده‌ها ──────────────────────────────────────────────── */}
      {blocked.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <h2 className="font-bold">
                خارج‌شده‌ها <span className="text-muted-foreground">({fa(blocked.length)})</span>
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                این‌ها را خودت از کلاس خارج کرده‌ای و با کد برنمی‌گردند. اگر اجازه بدهی،
                می‌توانند دوباره با کد عضو شوند.
              </p>
            </div>

            <ul className="flex flex-col divide-y divide-border">
              {blocked.map((member) => (
                <li
                  key={member.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <p className="truncate text-[13px]">{member.fullName ?? "بدون نام"}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => teacherAllowRejoin(klass.id, member.studentId),
                        () =>
                          /* ⚠️ ردیف از فهرست بیرون می‌رود و به «اعضا» هم
                             اضافه نمی‌شود: اجازه، خودش عضو نمی‌کند —
                             دانش‌آموز باید خودش دوباره با کد بیاید. */
                          setMembers((prev) =>
                            prev.filter((m) => m.studentId !== member.studentId),
                          ),
                      )
                    }
                  >
                    اجازهٔ بازگشت
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
