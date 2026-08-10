"use client";

import { useRef, useState } from "react";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";

/**
 * تأیید ایمیل، از داخل حساب کاربری.
 *
 * ⚠️ این تنها راهِ تأیید ایمیل بعد از ثبت‌نام است و تا امروز وجود نداشت.
 *
 * جریان ثبت‌نام کد را می‌فرستد، ولی حساب *قبل* از تأیید ساخته و وارد می‌شود
 * (تصمیمی درست: ایمیل ممکن است نرسد و قفل کردن حساب پشت آن یعنی دانش‌آموزی
 * که وارد سایت نمی‌شود). عارضه‌اش این بود که هر کس صفحهٔ کد را رد می‌کرد —
 * یا ایمیلش دیر می‌رسید — برای همیشه «تأییدنشده» می‌ماند و هیچ راهی برای
 * درست کردنش نداشت. هر دو endpoint از قبل آماده بودند و فقط رابط نداشتند.
 */
export default function EmailVerification() {
  const { user } = useCurrentUser();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!user) return null;

  if (user.emailVerified) {
    return (
      <section className="glass flex items-center gap-3 rounded-2xl p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">ایمیلت تأیید شده</h3>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">
            {user.email}
          </p>
        </div>
      </section>
    );
  }

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await apiPost<{ sent?: boolean; alreadyVerified?: boolean }>(
      "/api/v1/auth/send-verification",
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }
    if (result.data.alreadyVerified) {
      refreshCurrentUser();
      return;
    }

    setSent(true);
    setMessage("کد شش‌رقمی به ایمیلت فرستاده شد. صندوق ورودی و پوشهٔ اسپم را ببین.");
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const onDigit = (index: number, value: string) => {
    // فقط آخرین رقمِ واردشده — تا paste یا تایپ سریع خانه را خراب نکند.
    const digit = value.replace(/[^0-9۰-۹]/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const verify = async () => {
    const value = code.join("");
    if (value.length !== 6) {
      setError("کد ۶ رقمی را کامل وارد کن.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await apiPost("/api/v1/auth/verify-email", { code: value });
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    // هدر و بقیهٔ صفحه باید بلافاصله وضعیت تازه را ببینند، وگرنه تا رفرش
    // بعدی همچنان «تأییدنشده» نشان می‌دهند.
    refreshCurrentUser();
    setMessage("ایمیلت تأیید شد.");
  };

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl border border-gold/30 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">ایمیلت هنوز تأیید نشده</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            تأیید ایمیل باعث می‌شود اگر روزی رمزت را فراموش کردی بتوانی حسابت را پس بگیری.
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">
            {user.email}
          </p>
        </div>
      </div>

      {sent && (
        <div className="flex justify-center gap-2" dir="ltr">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={`رقم ${i + 1} از کد تأیید`}
              className="size-11 rounded-xl border-2 border-border bg-background text-center text-lg font-bold outline-none transition-colors focus:border-primary"
            />
          ))}
        </div>
      )}

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {sent && (
          <button
            type="button"
            disabled={loading}
            onClick={verify}
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "در حال بررسی…" : "تأیید کد"}
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={sendCode}
          className={`min-h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-60 ${
            sent
              ? "border border-border text-muted-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {loading && !sent ? "در حال ارسال…" : sent ? "ارسال دوبارهٔ کد" : "ارسال کد تأیید"}
        </button>
      </div>
    </section>
  );
}
