"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import OverlayPortal from "@/components/UI/OverlayPortal";
import TurnstileWidget from "@/components/UI/TurnstileWidget";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";

/**
 * «رمزم را فراموش کرده‌ام» — دو مسیرِ واقعاً متفاوت، نه دو برچسب.
 *
 * ⚠️ بازیابی با ایمیل **لینک** می‌فرستد و کاربر از صندوقِ ایمیلش ادامه
 * می‌دهد؛ بازیابی با پیامک **کد** می‌فرستد و رمزِ تازه همین‌جا گرفته
 * می‌شود. یکی کردنشان در یک فرم یعنی یکی از دو جریان نصفه بماند.
 *
 * ⚠️ این کامپوننت فقط وقتی پنجره باز است **mount** می‌شود و پراپِ `open`
 * ندارد. اگر همیشه mount می‌ماند و با یک بولین پنهان می‌شد، مقدارهای اولیهٔ
 * `useState` فقط یک بار خوانده می‌شدند — یعنی ایمیل و شماره‌ای که کاربر
 * *بعداً* در فرمِ ورود تایپ می‌کند هرگز به اینجا نمی‌رسید، و حالتِ نیمه‌کارهٔ
 * دفعهٔ قبل (مثلاً «کد فرستاده شد») هم باقی می‌ماند.
 *
 * ⚠️ کپچای این پنجره از کپچای فرمِ ورود جداست. هر توکنِ Turnstile
 * یک‌بارمصرف است و به همان ویجتی که ساختش گره خورده؛ اشتراک‌گذاری‌شان یعنی
 * هر بار که یکی مصرف شود، آن یکی هم بی‌اعتبار است.
 */
export default function ForgotPasswordModal({
  onClose,
  defaultMode,
  defaultEmail,
  defaultPhone,
}: {
  onClose: () => void;
  defaultMode: "email" | "mobile";
  defaultEmail: string;
  defaultPhone: string;
}) {
  const [mode, setMode] = useState<"email" | "mobile">(defaultMode);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [sent, setSent] = useState(false);
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  /** مرحلهٔ اولِ مسیرِ پیامکی: فرستادنِ کد. */
  const sendResetSms = async () => {
    setLoading(true);
    setError(null);

    const result = await apiPost("/api/v1/auth/mobile/reset", {
      phone,
      turnstileToken: captcha ?? undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setCaptchaNonce((n) => n + 1);
      return;
    }
    setCodeStep(true);
  };

  /** مرحلهٔ دوم: کد + رمزِ تازه. */
  const applyResetSms = async () => {
    setLoading(true);
    setError(null);

    const result = await apiPost("/api/v1/auth/mobile/reset", {
      phone,
      code,
      newPassword,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }
    setDone(true);
  };

  const sendResetEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("ایمیل معتبر نیست");
      return;
    }
    setLoading(true);
    setError(null);

    /* این endpoint همیشه موفق برمی‌گردد، حتی وقتی آن ایمیل حسابی ندارد —
       عمدی، تا نشود با آن فهمید چه کسی در سایت حساب دارد. پس پیامِ
       «فرستاده شد» هم همیشه همان است. */
    const result = await apiPost("/api/v1/auth/forgot-password", {
      email,
      turnstileToken: captcha ?? undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setCaptchaNonce((n) => n + 1);
      return;
    }
    setSent(true);
  };

  const tick = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="size-6"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );

  return (
    <OverlayPortal>
      <div
        dir="rtl"
        className="flex size-full items-center justify-center overflow-y-auto bg-black/40 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                {tick}
              </div>
              <h3 className="text-lg font-bold">رمز عبور تغییر کرد</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {/* ⚠️ همین یک جمله لازم است: سرور همهٔ نشست‌ها را باطل می‌کند
                    و کاربری که روی گوشی‌اش هم وارد بوده بیرون می‌افتد. بدونِ
                    گفتنش، آن را یک خرابی می‌بیند. */}
                از دستگاه‌های دیگر خارج شدی.
              </p>
              <ShinyButton onClick={onClose} className="mt-5 w-full">
                باشه
              </ShinyButton>
            </div>
          ) : codeStep ? (
            <>
              <h3 className="text-lg font-bold">رمز جدید</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                کد تأیید به موبایلت ارسال شد.
              </p>
              <input
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="کد تأیید"
                className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-center tracking-[0.4em] outline-none focus:border-primary"
              />
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="رمز جدید"
                className="mt-3 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
              />
              {error && <p className="mt-2 text-xs whitespace-pre-line text-red-500">{error}</p>}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCodeStep(false)}
                  className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border text-sm font-medium text-muted-foreground"
                >
                  برگشت
                </button>
                <ShinyButton disabled={loading} onClick={applyResetSms} className="flex-1">
                  {loading ? "در حال ذخیره…" : "ذخیره"}
                </ShinyButton>
              </div>
            </>
          ) : sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                {tick}
              </div>
              <h3 className="text-lg font-bold">ایمیل ارسال شد</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                لینک بازیابی به{" "}
                <bdi dir="ltr" className="text-foreground">
                  {email}
                </bdi>{" "}
                ارسال شد. اگر نرسید، پوشهٔ اسپم را هم ببین.
              </p>
              <ShinyButton onClick={onClose} className="mt-5 w-full">
                باشه
              </ShinyButton>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold">بازیابی رمز عبور</h3>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
                {(["email", "mobile"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`min-h-9 cursor-pointer rounded-lg text-sm transition-colors ${
                      mode === m
                        ? "bg-primary font-bold text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m === "email" ? "ایمیل" : "پیامک"}
                  </button>
                ))}
              </div>


              {mode === "email" ? (
                <input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
                />
              ) : (
                <input
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0913 118 1234"
                  className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
                />
              )}
              <div className="mt-4 flex justify-center">
                <TurnstileWidget onToken={setCaptcha} resetSignal={captchaNonce} />
              </div>
              {error && <p className="mt-2 text-xs whitespace-pre-line text-red-500">{error}</p>}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border text-sm font-medium text-muted-foreground"
                >
                  انصراف
                </button>
                <ShinyButton
                  disabled={loading}
                  onClick={mode === "email" ? sendResetEmail : sendResetSms}
                  className="flex-1"
                >
                  {loading ? "در حال ارسال…" : mode === "email" ? "ارسال لینک" : "ارسال کد"}
                </ShinyButton>
              </div>
            </>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}
