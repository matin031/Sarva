"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { teacherRotateJoinCode } from "@/lib/teacher/actions";
import { inviteUrl } from "@/lib/teacher/invite";

/**
 * دعوت به کلاس — کد، لینک، و QR.
 *
 * ⚠️ هر سه **یک چیز**اند و نه سه قابلیتِ جدا: کد، و لینک و QRیی که همان کد
 * را حمل می‌کنند. با چرخاندنِ کد هر سه با هم بی‌اثر می‌شوند، چون هیچ‌کدام
 * چیزِ مستقلی ذخیره نمی‌کند.
 *
 * ⚠️ QR از سرور می‌آید و نه از یک سرویسِ بیرونی. لینکِ دعوت کدِ کلاس را
 * دارد؛ فرستادنش به سرورِ یک شرکتِ دیگر برای «تولیدِ تصویر» همان چیزی است
 * که این قابلیت باید از آن محافظت کند.
 */
export default function InvitePanel({
  classId,
  initialCode,
  initialQr,
}: {
  classId: string;
  initialCode: string;
  /** SVGِ آمادهٔ QR — سمتِ سرور ساخته شده. */
  initialQr: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [qr, setQr] = useState(initialQr);
  const [showQr, setShowQr] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const link = inviteUrl(code);

  const rotate = () => {
    setError(null);
    startTransition(async () => {
      const result = await teacherRotateJoinCode(classId);
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      setCode(result.data.joinCode);
      setQr(result.data.qrSvg);
      setConfirmRotate(false);
    });
  };

  return (
    <Card data-tone="gold">
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold">دعوت به کلاس</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            کد را روی تخته بنویس، یا لینک و QR را در گروه کلاس بفرست. هر کسی که کد را داشته
            باشد می‌تواند عضو شود.
          </p>
        </div>

        {/* ── کد ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            value={code}
            label={`کپی کد عضویت ${code}`}
            className="font-mono text-lg tracking-[0.3em]"
          >
            <span dir="ltr">{code}</span>
          </CopyButton>

          <CopyButton value={link} label="کپی لینک دعوت">
            کپی لینک دعوت
          </CopyButton>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            aria-controls="class-qr"
          >
            <QrCode aria-hidden />
            {showQr ? "بستن QR" : "نمایش QR"}
          </Button>
        </div>

        {showQr && (
          <div id="class-qr" className="flex flex-col items-center gap-2">
            {/* ⚠️ زمینهٔ سفیدِ ثابت و نه رنگِ پوسته: QR روی زمینهٔ تیره اسکن
                نمی‌شود، و پنل حالتِ تاریک دارد. */}
            <div
              className="rounded-xl bg-white p-2 [&>svg]:h-auto [&>svg]:w-full [&>svg]:max-w-[220px]"
              /* SVG از سرورِ خودمان می‌آید و هیچ ورودیِ کاربری در آن
                 درون‌ریزی نمی‌شود — فقط کدِ کلاس که الگویش
                 `[A-Z2-9]{6,10}` است. */
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="text-[12px] text-muted-foreground">
              با دوربین گوشی اسکن کن — به همین کلاس می‌رسد.
            </p>
          </div>
        )}

        {/* ── چرخاندنِ کد ────────────────────────────────────────────── */}
        {confirmRotate ? (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3">
            <p className="text-[12.5px] leading-relaxed">
              کد قبلی دیگر برای عضویت جدید کار نمی‌کند و لینک و QR قبلی هم بی‌اثر می‌شوند.
              اعضای فعلی کلاس تغییری نمی‌کنند.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={rotate}>
                {pending ? "در حال ساخت…" : "کد تازه بساز"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setConfirmRotate(false)}
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
            className="self-start"
            onClick={() => setConfirmRotate(true)}
          >
            <RefreshCw aria-hidden />
            کد تازه
          </Button>
        )}

        {error && (
          <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * دکمهٔ کپی.
 *
 * ⚠️ `navigator.clipboard` در بافتِ ناامن (http روی یک IP محلی) اصلاً وجود
 * ندارد و صدا زدنش استثنا می‌دهد. بدونِ `catch`، کلیک در آن حالت یک خطای
 * مدیریت‌نشده می‌گذاشت و هیچ بازخوردی به کاربر نمی‌داد.
 *
 * ⚠️ و بازخوردِ «کپی شد» هم متنی است و هم `aria-live`: تغییرِ رنگ یا آیکن
 * به‌تنهایی برای کسی که صفحه‌خوان دارد هیچ چیزی نمی‌گوید.
 */
function CopyButton({
  value,
  label,
  className = "",
  children,
}: {
  value: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className={`inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2 text-[13px] transition-colors hover:border-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {children}
      {copied ? (
        <Check aria-hidden className="size-4 text-primary" />
      ) : (
        <ClipboardCopy aria-hidden className="size-4 text-muted-foreground" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "کپی شد" : ""}
      </span>
    </button>
  );
}
