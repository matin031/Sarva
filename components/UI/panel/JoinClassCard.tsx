"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LogIn, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { studentJoinClass, studentPreviewClass } from "@/lib/teacher/actions";
import type { ClassPreview } from "@/lib/teacher/classes";
import styles from "./panel-design.module.css";

/**
 * پیوستن به کلاس — **دو مرحله‌ای**.
 *
 * =============================================================================
 * ⚠️ چرا مرحلهٔ دوم اضافه شد
 * =============================================================================
 *
 * تا امروز وارد کردنِ کد مستقیماً عضویت می‌ساخت. یعنی دانش‌آموز پیش از آنکه
 * بداند کلاسِ کیست، در کدام مدرسه است، و مهم‌تر از همه **دبیر از این به بعد
 * چه چیزی از او می‌بیند**، قبولش کرده بود.
 *
 * برای دسترسی به دادهٔ آموزشیِ یک نوجوان، «کد را زدی پس قبول کردی» رضایت
 * نیست. حالا اول کارتِ تأیید می‌آید و عضویت فقط با کلیکِ دومِ صریح انجام
 * می‌شود.
 *
 * ⚠️ و مرحلهٔ اول **هیچ چیزی نمی‌نویسد** — نه ردیفی، نه اعلانی. کسی که فقط
 * می‌خواست ببیند کلاس چیست، عضو نمی‌شود.
 */
export default function JoinClassCard({
  onJoined,
  initialCode = null,
}: {
  onJoined: () => void;
  /** کدی که از لینکِ دعوت آمده. */
  initialCode?: string | null;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [preview, setPreview] = useState<ClassPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lookUp = () => {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const result = await studentPreviewClass(code);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      setPreview(result.data);
    });
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      /* ⚠️ کد دوباره فرستاده می‌شود و نه شناسهٔ کلاس.

         سرور همه‌چیز را از نو می‌سنجد — ممکن است بینِ پیش‌نمایش و این
         کلیک، دبیر کد را چرخانده یا عضوگیری را بسته باشد. اعتماد به
         نتیجهٔ پیش‌نمایش یعنی یک پنجرهٔ TOCTOU. */
      const result = await studentJoinClass(code);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        setPreview(null);
        return;
      }
      setCode("");
      setPreview(null);
      onJoined();
    });
  };

  /* ⚠️ کدی که از لینکِ دعوت آمده، **یک بار** پیش‌نمایش می‌گیرد.
  
     `useRef` لازم است و نه یک وابستگیِ ساده: بدونِ آن، هر رندرِ دوباره
     (مثلاً وقتی کاربر چیزی تایپ می‌کند) پیش‌نمایش را دوباره می‌گرفت و
     سقفِ نرخ را بی‌دلیل می‌سوزاند.
  
     ⚠️ و فقط **پیش‌نمایش** — نه عضویت. لینکِ دعوت نباید کسی را با یک
     کلیک عضو کند؛ همان کارتِ تأیید باید دیده شود. */
  const autoLookedUp = useRef(false);
  useEffect(() => {
    if (!initialCode || autoLookedUp.current) return;
    autoLookedUp.current = true;
    lookUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <Card data-tone="mint">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <LogIn aria-hidden className="size-5" />
        </span>
        <div>
          <h2>پیوستن به کلاس</h2>
          <p>کدی که دبیرت داده را وارد کن تا کلاس را ببینی.</p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="کد عضویت" htmlFor="join-code" className="flex-1">
            {/* ⚠️ `dir="ltr"` روی خودِ input و نه روی کارت: کد لاتین است و
                باید از چپ تایپ شود، ولی برچسب و بقیهٔ صفحه راست‌به‌چپ
                می‌مانند. */}
            <Input
              id="join-code"
              dir="ltr"
              value={code}
              placeholder="AB3K9P"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => {
                setCode(e.target.value);
                /* کد که عوض شد، پیش‌نمایشِ قبلی دیگر مالِ این کد نیست. */
                setPreview(null);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending && code.trim().length >= 6) lookUp();
              }}
              className="text-center font-mono uppercase tracking-[0.3em]"
            />
          </Field>
          <Button type="button" disabled={pending || code.trim().length < 6} onClick={lookUp}>
            {pending && !preview ? "در حال بررسی…" : "دیدن کلاس"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
            {error}
          </p>
        )}

        {preview && (
          <ConfirmCard
            preview={preview}
            pending={pending}
            onConfirm={confirm}
            onCancel={() => {
              setPreview(null);
              setCode("");
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * کارتِ تأیید — جایی که رضایت واقعاً گرفته می‌شود.
 *
 * ⚠️ متنِ افشا عمداً **دقیق** است و نه کلی. «دبیر فعالیت شما را می‌بیند» یک
 * جملهٔ ترسناکِ مبهم است که هم بیش از واقعیت می‌گوید و هم کمتر: نوجوانی که
 * آن را می‌خواند نمی‌داند خریدهایش هم دیده می‌شود یا نه. پس هر دو طرف
 * صریح نوشته می‌شوند — آنچه دیده می‌شود و آنچه نمی‌شود.
 */
function ConfirmCard({
  preview,
  pending,
  onConfirm,
  onCancel,
}: {
  preview: ClassPreview;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      /* ⚠️ `role="group"` با برچسب: این بخش بعد از یک اقدام ظاهر می‌شود و
         صفحه‌خوان باید بداند چه چیزی تازه آمده. */
      role="group"
      aria-label="تأیید عضویت در کلاس"
      className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4"
    >
      <div>
        <h3 className="font-bold">{preview.className}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {preview.schoolName} · پایهٔ {GRADE_LABEL[preview.grade]}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          دبیر: {preview.teacherName ?? "—"}
        </p>
      </div>

      {preview.alreadyMember ? (
        <p className="text-[13px]">شما از قبل عضو این کلاس هستید.</p>
      ) : !preview.joinable ? (
        <p role="alert" className="text-[13px] text-destructive">
          {preview.reason}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-3 text-[12.5px] leading-relaxed">
            <p className="flex items-start gap-2 font-medium">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              با عضویت در این کلاس، دبیر می‌تواند عملکرد آموزشی مرتبط با فعالیت‌های شما در
              سروا را مشاهده کند.
            </p>
            <p className="text-muted-foreground">
              یعنی پاسخ‌ها و نتیجه‌های تمرین‌ها و آزمون‌ها، و زمان آخرین فعالیت آموزشی شما.
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">نمی‌بیند:</span> پرداخت‌ها،
              صورتحساب، پیام‌های پشتیبانی، دستگاه‌ها و نشست‌ها، اطلاعات ورود، و کلاس‌های
              دیگر شما.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onConfirm} disabled={pending}>
              {pending ? "در حال ثبت…" : "تأیید و عضویت"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              <X aria-hidden />
              انصراف
            </Button>
          </div>
        </>
      )}

      {(preview.alreadyMember || !preview.joinable) && (
        <Button type="button" variant="ghost" onClick={onCancel} className="self-start">
          بستن
        </Button>
      )}
    </div>
  );
}
