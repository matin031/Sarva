"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import { emailField, passwordField } from "@/lib/auth/schemas";
import { firstNameField, lastNameField } from "@/lib/profile/name";
import GoogleSignInButton from "./GoogleSignInButton";
import TurnstileWidget from "@/components/UI/TurnstileWidget";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import AuthTabs, { type AuthTab } from "@/components/UI/auth/AuthTabs";
import MobileCodeForm from "@/components/UI/auth/MobileCodeForm";
import PasswordField from "@/components/UI/auth/PasswordField";

/**
 * فرمِ **ثبت‌نام** — دو تب، دقیقاً مثل فرمِ ورود.
 *
 * ⚠️ تا دیروز ثبت‌نام فقط یک راه داشت (ایمیل و رمز) در حالی که ورود دو تب
 * داشت. نتیجه‌اش این بود که کاربری که تبِ «موبایل» را در ورود دیده بود و
 * «حساب کاربری نداری؟» را می‌زد، ناگهان به فرمی می‌رسید که اصلاً شماره
 * نمی‌گرفت — و فکر می‌کرد ثبت‌نام با موبایل ممکن نیست. حالا هر دو صفحه از
 * یک `AuthTabs` و یک `MobileCodeForm` استفاده می‌کنند.
 *
 * ⚠️ تبِ موبایل **همان** مسیرِ سرورِ ورود را می‌زند و این عمدی است؛ چرایی‌اش
 * بالای `MobileCodeForm` نوشته شده: تصمیمِ «ورود یا ثبت‌نام» بعد از تأیید
 * کد و سمتِ سرور گرفته می‌شود، نه با انتخابِ کاربر در فرم.
 *
 * ⚠️ قوانینِ اعتبارسنجی از `lib/auth/schemas.ts` و `lib/profile/name.ts`
 * می‌آیند و نه از کپیِ محلی. تا امروز این فایل نسخهٔ خودش را داشت و آن
 * نسخه با سرور از هم افتاده بود: سقفِ رمز در سرور به ۷۲ رفت ولی اینجا ۱۶
 * ماند، یعنی فرم رمزی را رد می‌کرد که سرور کاملاً می‌پذیرفت.
 */
/* ⚠️ شماره موبایل اینجا نیست و این عمدی است: تبِ «موبایل» درست کنارِ همین
   فرم است و کارش همین است. چرایی کاملش بالای `registerSchema`. */
const emailSchema = z.object({
  firstName: firstNameField,
  lastName: lastNameField,
  email: emailField,
  password: passwordField,
});
type EmailFormData = z.infer<typeof emailSchema>;

export default function SignUp({
  googleEnabled,
  onSuccess,
  setIsLogin,
  /** مقصدِ بعد از ثبت‌نام. سرور آن را از allowlist رد کرده (lib/auth/return-to). */
  returnTo = "/panel/home",
}: {
  onSuccess: (identifier: string) => void;
  setIsLogin: (value: boolean) => void;
  /** فقط وقتی GOOGLE_CLIENT_ID تنظیم شده باشد — از سرور می‌آید. */
  googleEnabled: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("mobile");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* توکن کپچا. وقتی کپچا خاموش باشد (کلید در محیط نیست) همیشه null می‌ماند و
     سرور هم چیزی نمی‌خواهد. `captchaNonce` بعد از هر تلاشِ ناموفق زیاد
     می‌شود تا ویجت ریست شود — هر توکن Turnstile فقط یک بار قابل مصرف است. */
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

  /**
   * ترتیبِ ثبت‌نام عمداً برعکسِ چیزی است که به ذهن می‌رسد.
   *
   * قبلاً: کد بفرست ← کد را تأیید کن ← تازه حساب بساز ← بعد وارد شو.
   * حالا:  حساب بساز و همان‌جا وارد شو ← بعد کدِ تأیید ایمیل بفرست.
   *
   * دلیلش این است که ایمیل ممکن است هرگز نرسد (فیلترینگ، اسپم، قطعیِ
   * سرویس). در ترتیبِ قدیمی، آن یعنی دانش‌آموزی که فرم را پر کرده هیچ
   * حسابی ندارد و باید همه‌چیز را از نو بزند. حالا حسابش ساخته شده و وارد
   * سایت است؛ تأیید ایمیل کاری است که می‌تواند بعداً انجام شود.
   */
  const onSubmit = async (data: EmailFormData) => {
    setError(null);
    setLoading(true);
    try {
      const registered = await apiPost("/api/v1/auth/register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        turnstileToken: captchaToken ?? undefined,
      });

      if (!registered.ok) {
        setError(registered.errors.join("\n"));
        setCaptchaNonce((n) => n + 1);
        return;
      }

      // ثبت‌نام سشن هم داده؛ هدر باید همین حالا کاربر را ببیند.
      refreshCurrentUser();

      setPendingEmail(data.email);
      setShowOtp(true);

      /* اگر ارسالِ کد شکست بخورد ثبت‌نام خراب نمی‌شود — کاربر روی صفحهٔ کد
         می‌ماند و می‌تواند «ارسال دوباره» بزند. */
      const sent = await apiPost("/api/v1/auth/send-verification");
      if (!sent.ok) setError(sent.errors.join("\n"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("کد را کامل وارد کن.");
      return;
    }

    setError(null);
    setLoading(true);

    /* حساب و سشن از قبل در onSubmit ساخته شده‌اند؛ اینجا فقط ایمیل تأیید
       می‌شود. سرور ایمیل را از سشن می‌گیرد، نه از این فرم. */
    const verified = await apiPost("/api/v1/auth/verify-email", { code });

    if (!verified.ok) {
      setError(verified.errors.join("\n"));
      setLoading(false);
      return;
    }

    refreshCurrentUser();
    onSuccess(pendingEmail);
    router.push(returnTo);
    router.refresh();
  };

  /* ── مرحلهٔ کدِ تأییدِ ایمیل ─────────────────────────────────────────── */
  if (showOtp) {
    return (
      <div
        dir="rtl"
        className="glass relative z-20 mt-10 flex w-[95%] flex-col items-center gap-4 rounded-xl px-8 py-10 text-center sm:max-w-115"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/20">
          <Mail aria-hidden className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">کد تأیید را وارد کن</h2>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          کد تأیید به{" "}
          <bdi dir="ltr" className="text-primary">
            {pendingEmail}
          </bdi>{" "}
          ارسال شد
        </p>

        <div className="mt-2 flex justify-center gap-2" dir="ltr">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              aria-label={`رقم ${i + 1} از کد تأیید`}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="h-13 w-11 rounded-xl border-2 border-muted-foreground/10 bg-background text-center text-xl font-bold outline-none transition-colors duration-200 focus:border-primary"
            />
          ))}
        </div>

        {error && <p className="text-sm whitespace-pre-line text-red-500">{error}</p>}

        <ShinyButton onClick={handleVerifyOtp} disabled={loading} className="mt-2 w-full">
          {loading ? "در حال تأیید…" : "تأیید"}
        </ShinyButton>

        {/* ⚠️ «بعداً» یک راهِ فرار نیست بلکه حقیقتِ همین جریان است: حساب
            ساخته شده و کاربر همین الان وارد است. بدونِ این دکمه، کسی که
            ایمیلش نرسیده روی این صفحه گیر می‌کرد. */}
        <button
          type="button"
          onClick={() => {
            router.push(returnTo);
            router.refresh();
          }}
          className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          بعداً تأیید می‌کنم
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="glass relative z-20 mt-10 w-[95%] rounded-xl px-4 pt-8 pb-4 text-sm sm:max-w-115 sm:px-8 sm:text-base"
    >
      <AuthTabs
        value={tab}
        onChange={(next) => {
          setTab(next);
          setError(null);
        }}
      />

      {tab === "mobile" ? (
        <MobileCodeForm intent="signup" returnTo={returnTo} onSuccess={onSuccess} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5">
          {/* نام و نام خانوادگی کنار هم: یک سطر به‌جای دو، و روی موبایل
              زیرِ هم. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signup-first" className="text-sm text-muted-foreground">
                نام
              </label>
              <input
                {...register("firstName")}
                id="signup-first"
                autoComplete="given-name"
                className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-right outline-none placeholder:text-muted-foreground/30 focus:border-primary"
                type="text"
                placeholder="سعدی"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-last" className="text-sm text-muted-foreground">
                نام خانوادگی
              </label>
              <input
                {...register("lastName")}
                id="signup-last"
                autoComplete="family-name"
                className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-right outline-none placeholder:text-muted-foreground/30 focus:border-primary"
                type="text"
                placeholder="شیرازی"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="signup-email" className="text-sm text-muted-foreground">
              ایمیل
            </label>
            <input
              {...register("email")}
              id="signup-email"
              dir="ltr"
              autoComplete="email"
              className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none placeholder:text-muted-foreground/30 focus:border-primary"
              type="text"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="signup-password" className="text-sm text-muted-foreground">
              رمز عبور
            </label>
            <div className="mt-1">
              <PasswordField
                {...register("password")}
                id="signup-password"
                autoComplete="new-password"
                placeholder="*************"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs whitespace-pre-line text-red-500 sm:text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* وقتی کپچا خاموش باشد این هیچ چیزی رندر نمی‌کند و فضایی هم
              نمی‌گیرد. */}
          <div className="mt-5 flex justify-center">
            <TurnstileWidget onToken={setCaptchaToken} resetSignal={captchaNonce} />
          </div>

          {error && (
            <p className="mt-3 text-center text-xs whitespace-pre-line text-red-500 sm:text-sm">
              {error}
            </p>
          )}

          {/* ⚠️ `type="submit"`ِ صریح — `ShinyButton` پیش‌فرض
              `type="button"` می‌گذارد. */}
          <ShinyButton type="submit" disabled={loading} className="mt-5 w-full">
            {loading ? "در حال ثبت‌نام…" : "ساخت حساب"}
          </ShinyButton>
        </form>
      )}

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            یا
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton label="ثبت‌نام با حساب گوگل" returnTo={returnTo} />
        </>
      )}

      <p className="mt-8 text-center">
        حساب کاربری داری؟
        <span onClick={() => setIsLogin(true)} className="cursor-pointer text-primary">
          {" "}
          وارد شو
        </span>
      </p>
    </div>
  );
}
