"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import { phoneField } from "@/lib/auth/schemas";
import { firstNameField, lastNameField } from "@/lib/profile/name";
import TurnstileWidget from "@/components/UI/TurnstileWidget";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";

/**
 * «شماره‌ات را بده، کد را بزن، بیا تو» — یک کامپوننت، دو صفحه.
 *
 * =============================================================================
 * ⚠️ چرا ورود و ثبت‌نامِ پیامکی *یک* کامپوننت‌اند
 * =============================================================================
 *
 * چون سمتِ سرور هم یک چیزند. `/api/v1/auth/mobile/send-code` عمداً نمی‌گوید
 * این شماره حساب دارد یا نه (وگرنه به ابزارِ فهرست کردنِ کاربرانِ سایت
 * تبدیل می‌شد)، و تصمیمِ «ورود یا ثبت‌نام» *بعد* از تأیید کد در
 * `mobile/verify` گرفته می‌شود — جایی که صاحبِ خط بودن اثبات شده.
 *
 * پس دو فرمِ جدا با دو مسیرِ یکسان، فقط دو نسخه از یک باگ می‌ساخت. تنها
 * چیزی که بینِ ورود و ثبت‌نام فرق می‌کند **متنِ توضیح** است، و همان یک
 * پراپ است.
 *
 * =============================================================================
 * ⚠️ کپچا اجباری نیست ولی حذف هم نشده
 * =============================================================================
 *
 * `TurnstileWidget` وقتی کلید در محیط نباشد هیچ چیزی رندر نمی‌کند و فضایی
 * هم نمی‌گیرد؛ سرور هم در آن حالت توکنی نمی‌خواهد. ولی وقتی کلید هست، این
 * پرهزینه‌ترین endpointِ سایت است: هر کلیک یک **پیامک** است، یعنی پول.
 * سقف‌های `issuePhoneOtp` لایهٔ دوم‌اند و نه اول.
 *
 * ⚠️ `captchaNonce` بعد از هر شکست بالا می‌رود. هر توکنِ Turnstile
 * یک‌بارمصرف است؛ بدونِ ریست، تلاشِ دوم همیشه «کپچا نامعتبر» می‌گرفت و
 * کاربر دلیلش را نمی‌فهمید.
 */

/**
 * ⚠️ نام و نام خانوادگی **فقط در ثبت‌نام** اجباری‌اند، ولی همیشه در شکلِ
 * داده هستند.
 *
 * دو شِمای جدا با دو نوعِ متفاوت، `useForm` را به یک نوعِ اجتماعی می‌کشاند
 * که هر دو را بپذیرد و آن‌وقت هر جای دیگری در این فایل باید `undefined` را
 * هم حساب کند. با `superRefine` شکلِ داده ثابت می‌ماند (`string`) و فقط
 * *اجباری بودن* شرطی می‌شود — که دقیقاً همان چیزی است که فرق می‌کند.
 *
 * ⚠️ و قانونِ نام از `lib/profile/name.ts` می‌آید، همان جایی که فرمِ ایمیل و
 * صفحهٔ تکمیلِ حساب هم از آن می‌خوانند. سه نسخهٔ جدا از «نامِ فارسی چیست»
 * یعنی سه پیامِ خطای متفاوت برای یک ورودی.
 */
function schemaFor(intent: "login" | "signup") {
  return z
    .object({
      mobile: phoneField,
      firstName: z.string().trim(),
      lastName: z.string().trim(),
    })
    .superRefine((value, ctx) => {
      if (intent !== "signup") return;
      for (const [key, field] of [
        ["firstName", firstNameField],
        ["lastName", lastNameField],
      ] as const) {
        const parsed = field.safeParse(value[key]);
        if (!parsed.success) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: parsed.error.issues[0]?.message ?? "نامعتبر است",
          });
        }
      }
    });
}

type FormData = { mobile: string; firstName: string; lastName: string };

export default function MobileCodeForm({
  intent,
  returnTo,
  onSuccess,
  onPhoneChange,
}: {
  /** فقط متن را عوض می‌کند؛ مسیرِ سرور در هر دو حالت یکی است. */
  intent: "login" | "signup";
  /** مقصدِ بعد از ورود — سرور آن را از allowlist رد کرده. */
  returnTo: string;
  onSuccess?: (phone: string) => void;
  /** تا فرمِ بیرونی بتواند «بازیابی رمز با پیامک» را پیش‌پُر کند. */
  onPhoneChange?: (raw: string) => void;
}) {
  const router = useRouter();

  const [showOtp, setShowOtp] = useState(false);
  /* ⚠️ شش خانه و نه چهار: سرور کدِ شش‌رقمی صادر می‌کند (`issuePhoneOtp`).
     چهار خانه یعنی کاربر هیچ‌وقت نمی‌تواند کدِ کامل را وارد کند — و چون
     دکمه فعال می‌ماند، خطایی که می‌گرفت «کد اشتباه است» بود، نه «جا کم
     داری». */
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  /** شمارهٔ پوشیده‌ای که سرور برگردانده — برای نمایش در مرحلهٔ کد. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  /* ⚠️ شمارنده‌ای فقط برای «دوباره روی خانهٔ اول فوکوس کن».
     فوکوس نمی‌تواند مستقیم داخلِ تابعِ submit انجام شود: آن تابع در زمانِ
     رندر به `handleSubmit` پاس داده می‌شود و خواندنِ `ref.current` آنجا را
     کامپایلرِ React خطا می‌گیرد (react-hooks/refs). */
  const [focusFirstNonce, setFocusFirstNonce] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schemaFor(intent)),
    // ⚠️ لازم است: بدونِ مقدارِ اولیه، فیلدهای کنترل‌نشده `undefined` شروع
    // می‌کنند و React در اولین تایپ «uncontrolled → controlled» هشدار می‌دهد.
    defaultValues: { mobile: "", firstName: "", lastName: "" },
  });

  useEffect(() => {
    if (!showOtp) return;
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(timer);
  }, [showOtp, focusFirstNonce]);

  /* شمارشِ معکوسِ «ارسال دوباره».
     ⚠️ فقط یک راهنمای بصری است؛ سقفِ واقعی سمتِ سرور است
     (`SMS_OTP_RESEND_COOLDOWN_SECONDS`). رفرشِ صفحه این را صفر می‌کند ولی
     سرور همچنان رد می‌کند — و همان‌جا پیامِ درست را می‌دهد. */
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

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

  /** مرحلهٔ اول: درخواستِ کد. */
  const sendCode = async (mobile: string) => {
    setLoading(true);
    const result = await apiPost("/api/v1/auth/mobile/send-code", {
      phone: mobile,
      turnstileToken: captchaToken ?? undefined,
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setLoading(false);
      setCaptchaNonce((n) => n + 1);
      return;
    }

    const data = result.data as { phoneMasked?: string | null } | undefined;
    setSentTo(data?.phoneMasked ?? null);
    setOtp(["", "", "", "", "", ""]);
    setShowOtp(true);
    setResendIn(90);
    setLoading(false);
  };

  const onSubmit = async (data: FormData) => {
    setError(null);

    if (!showOtp) {
      await sendCode(data.mobile);
      return;
    }

    const code = otp.join("");
    if (code.length < 6) {
      setError("کد را کامل وارد کن.");
      return;
    }

    setLoading(true);
    /* ⚠️ نام فقط در ثبت‌نام فرستاده می‌شود، و سرور هم فقط وقتی **حسابِ
       تازه** می‌سازد به آن نگاه می‌کند. اگر این شماره از قبل حساب داشته
       باشد، نامِ فرستاده‌شده نادیده گرفته می‌شود — وگرنه این فرم راهی
       می‌شد برای عوض کردنِ نامِ یک حسابِ موجود. */
    const result = await apiPost("/api/v1/auth/mobile/verify", {
      phone: data.mobile,
      code,
      ...(intent === "signup"
        ? { firstName: data.firstName, lastName: data.lastName }
        : {}),
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setOtp(["", "", "", "", "", ""]);
      setFocusFirstNonce((n) => n + 1);
      setLoading(false);
      return;
    }

    refreshCurrentUser();
    onSuccess?.(data.mobile);

    /* ⚠️ اگر این شماره تازه حساب گرفته باشد هنوز نامی ندارد — و گیتِ
       `proxy.ts` همین‌جا وسطِ راه می‌ایستد و به صفحهٔ تکمیل می‌بردش. پس
       اینجا مقصدِ خاصی حساب نمی‌شود: مقصد همان `returnTo` است و گیت خودش
       تصمیم می‌گیرد. */
    router.push(returnTo);
    router.refresh();
  };

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="mt-5">
      {/* ⚠️ در ثبت‌نام، نام **همین‌جا** گرفته می‌شود و نه یک صفحهٔ بعدی.
          حسابی که با کدِ پیامکی ساخته می‌شود هیچ نامی ندارد؛ اگر اینجا
          پرسیده نشود، کاربرِ تازه بلافاصله به صفحهٔ «تکمیل حساب» پرت
          می‌شود — یعنی دو مرحله برای کاری که یک فرم جا دارد. */}
      {intent === "signup" && !showOtp && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="auth-first" className="text-sm text-muted-foreground">
              نام
            </label>
            <input
              {...register("firstName")}
              id="auth-first"
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
            <label htmlFor="auth-last" className="text-sm text-muted-foreground">
              نام خانوادگی
            </label>
            <input
              {...register("lastName")}
              id="auth-last"
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
      )}

      <div>
        <label htmlFor="auth-mobile" className="text-sm text-muted-foreground">
          شمارهٔ موبایل
        </label>
        <input
          {...register("mobile", { onChange: (e) => onPhoneChange?.(e.target.value) })}
          id="auth-mobile"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          disabled={showOtp}
          className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none placeholder:text-muted-foreground/30 focus:border-primary disabled:opacity-60"
          type="text"
          placeholder="0913 118 1234"
        />
        {errors.mobile && (
          <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.mobile.message}</p>
        )}
      </div>

      {/* ⚠️ پیش از ارسال هیچ توضیحی نیست. «کد برایت ارسال می‌شود» چیزی بود
          که دکمهٔ «ارسال کد» خودش می‌گوید؛ خبر بعد از ارسال می‌آید. */}

      {showOtp && (
        <div className="mt-5">
          {/* ⚠️ شماره حتماً داخلِ <bdi> می‌رود.

              `maskPhone` «0901 *** 7757» می‌دهد: سه پاره که الگوریتمِ دوسویهٔ
              یونیکد آن‌ها را عدد، خنثی، عدد می‌بیند. داخلِ یک پاراگرافِ
              راست‌به‌چپ، خنثیِ وسط جهتِ پاراگراف را می‌گیرد و دو گروهِ رقم
              جایِ هم را عوض می‌کنند — کاربر «7757 *** 0901» می‌دید و فکر
              می‌کرد شماره را اشتباه وارد کرده. */}
          <p className="text-sm text-muted-foreground">
            کد تأیید به{" "}
            <bdi dir="ltr" className="panel-num">
              {sentTo ?? "شماره‌ات"}
            </bdi>{" "}
            ارسال شد.
          </p>

          {/* dir=ltr: ارقام از چپ پر می‌شوند، مثل هر کدِ عددیِ دیگری. */}
          <div dir="ltr" className="mt-3 flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                onPaste={(e) => {
                  /* چسباندنِ کلِ کد از پیامک — کاری که تقریباً همه می‌کنند.
                     بدونِ این، فقط رقمِ اول جا می‌افتاد. */
                  const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                  if (text.length < 2) return;
                  e.preventDefault();
                  const next = [...otp];
                  for (let k = 0; k < 6; k++) next[k] = text[k] ?? "";
                  setOtp(next);
                  inputRefs.current[Math.min(text.length, 5)]?.focus();
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={`رقم ${i + 1} از کد تأیید`}
                className="size-11 rounded-xl border border-muted-foreground/10 text-center text-lg outline-none focus:border-primary"
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={loading || resendIn > 0}
              onClick={() => {
                setError(null);
                setCaptchaNonce((n) => n + 1);
                void sendCode(getValues().mobile);
              }}
              className="cursor-pointer text-primary hover:underline disabled:no-underline disabled:opacity-50"
            >
              {resendIn > 0 ? `ارسال دوباره (${resendIn})` : "ارسال دوباره"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOtp(false);
                setError(null);
                setOtp(["", "", "", "", "", ""]);
              }}
              className="cursor-pointer text-muted-foreground hover:underline"
            >
              تغییر شماره
            </button>
          </div>
        </div>
      )}

      {/* در مرحلهٔ واردکردنِ کد نشان داده نمی‌شود: آنجا دیگر پیامکی فرستاده
          نمی‌شود و کپچای اضافه فقط یک مانع است. */}
      {!showOtp && (
        <div className="mt-5 flex justify-center">
          <TurnstileWidget onToken={setCaptchaToken} resetSignal={captchaNonce} />
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-xs whitespace-pre-line text-red-500 sm:text-sm">
          {error}
        </p>
      )}

      {/* ⚠️ `type="submit"`ِ صریح: `ShinyButton` پیش‌فرض `type="button"`
          می‌گذارد (تا دکمه‌های داخلِ فرم تصادفی submit نکنند) و بدونِ این
          خط، Enter در فیلدِ شماره هیچ کاری نمی‌کرد. */}
      <ShinyButton type="submit" disabled={loading} className="mt-5 w-full">
        {loading
          ? showOtp
            ? "در حال ورود…"
            : "در حال ارسال…"
          : showOtp
            ? "ورود"
            : "ارسال کد"}
      </ShinyButton>
    </form>
  );
}
