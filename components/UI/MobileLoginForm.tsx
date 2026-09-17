"use client";
import GoogleSignInButton from "./GoogleSignInButton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/auth/schemas";
import TurnstileWidget from "@/components/UI/TurnstileWidget";
import OverlayPortal from "@/components/UI/OverlayPortal";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";

const mobileSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09121234567)"),
});
type MobileFormData = z.infer<typeof mobileSchema>;

/**
 * فرم *ورود* — عمداً همان loginSchema سرور، نه قوانین ثبت‌نام.
 *
 * قالبِ رمز اینجا بررسی نمی‌شود و این عمدی است: اگر فرم ورود بگوید «رمز باید
 * حداقل ۸ کاراکتر باشد»، به کسی که دارد رمز حدس می‌زند گفته‌ایم رمزِ این حساب
 * چه شکلی *نیست*. ضمناً کاربری که رمزش را قبل از قوانین جدید ساخته باید
 * بتواند وارد شود.
 */
const emailSchema = loginSchema;
type EmailFormData = z.infer<typeof emailSchema>;

export default function LoginForm({
  googleEnabled,
  onSuccess,
  setIsLogin,
  /** مقصدِ بعد از ورود. سرور آن را از allowlist رد کرده (lib/auth/return-to). */
  returnTo = "/panel/home",
}: {
  onSuccess: (identifier: string) => void;
  setIsLogin: (value: boolean) => void;
  /** فقط وقتی GOOGLE_CLIENT_ID تنظیم شده باشد — از سرور می‌آید. */
  googleEnabled: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "mobile">("mobile");
  const [showOtp, setShowOtp] = useState(false);
  /* ⚠️ شش خانه و نه چهار.
     سرور کدِ شش‌رقمی صادر می‌کند (`issuePhoneOtp`). چهار خانه یعنی کاربر
     هیچ‌وقت نمی‌تواند کدِ کامل را وارد کند — و چون دکمه فعال می‌ماند، خطایی
     که می‌گیرد «کد اشتباه است» بود، نه «جا کم داری». */
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  /** شمارهٔ پوشیده‌ای که سرور برگردانده — برای نمایش در مرحلهٔ کد. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  /** ثانیه‌های باقی‌مانده تا امکانِ ارسال دوباره. */
  const [resendIn, setResendIn] = useState(0);
  /* ⚠️ شمارنده‌ای فقط برای «دوباره روی خانهٔ اول فوکوس کن».
     فوکوس نمی‌تواند مستقیم داخلِ `onMobileSubmit` انجام شود: آن تابع در
     زمانِ رندر به `handleSubmit` پاس داده می‌شود و خواندنِ `ref.current`
     آنجا را کامپایلرِ React خطا می‌گیرد (react-hooks/refs). پس به‌جای دست
     زدن به ref، یک عدد عوض می‌شود و افکتِ فوکوس کار را می‌کند. */
    const [focusFirstNonce, setFocusFirstNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register: registerMobile,
    handleSubmit: handleMobileSubmit,
    getValues: getMobileValues,
    formState: { errors: mobileErrors },
  } = useForm<MobileFormData>({ resolver: zodResolver(mobileSchema) });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    getValues: getEmailValues,
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // دو کپچای مستقل: یکی برای فرم ورود، یکی برای پنجرهٔ فراموشی رمز. مشترک
  // بودنشان یعنی توکنی که در یکی مصرف شده، دیگری را هم می‌سوزاند.
  const [loginCaptcha, setLoginCaptcha] = useState<string | null>(null);
  /* ⚠️ کپچای جدا برای تبِ موبایل و نه همان کپچای ایمیل.
     هر توکنِ Turnstile یک‌بارمصرف است و به همان ویجتی که ساختش گره خورده؛
     اشتراک‌گذاری‌شان یعنی هر بار که یکی مصرف شود، آن یکی هم بی‌اعتبار است. */
  const [mobileCaptcha, setMobileCaptcha] = useState<string | null>(null);
  const [mobileCaptchaNonce, setMobileCaptchaNonce] = useState(0);
  const [loginCaptchaNonce, setLoginCaptchaNonce] = useState(0);
  const [resetCaptcha, setResetCaptcha] = useState<string | null>(null);
  /* ⚠️ بازیابی با ایمیل و با پیامک دو مسیرِ متفاوت‌اند و نه یک فرم با دو
     برچسب: اولی لینک می‌فرستد و کاربر از ایمیل ادامه می‌دهد، دومی کد
     می‌فرستد و رمزِ تازه همین‌جا گرفته می‌شود. */
  const [resetMode, setResetMode] = useState<"email" | "mobile">("email");
  const [resetPhone, setResetPhone] = useState("");
  /** بعد از رفتنِ کد: مرحلهٔ واردکردنِ کد و رمزِ تازه. */
  const [resetCodeStep, setResetCodeStep] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetCaptchaNonce, setResetCaptchaNonce] = useState(0);

  const openForgot = () => {
    setResetEmail(getEmailValues("email") || "");
    /* اگر کاربر روی تبِ موبایل بوده، همان شماره‌اش را می‌آوریم و مسیرِ
       پیامکی را پیش‌فرض می‌گذاریم — کسی که با موبایل وارد می‌شود، رمزش را
       هم با موبایل می‌خواهد. */
    setResetPhone(getMobileValues().mobile || "");
    setResetMode(tab === "mobile" ? "mobile" : "email");
    setResetError(null);
    setResetSent(false);
    setResetCodeStep(false);
    setResetDone(false);
    setResetCode("");
    setResetNewPassword("");
    setForgotOpen(true);
  };

  /** مرحلهٔ اولِ مسیرِ پیامکی: فرستادنِ کد. */
  const sendResetSms = async () => {
    setResetLoading(true);
    setResetError(null);

    const result = await apiPost("/api/v1/auth/mobile/reset", {
      phone: resetPhone,
      turnstileToken: resetCaptcha ?? undefined,
    });
    setResetLoading(false);

    if (!result.ok) {
      setResetError(result.errors.join("\n"));
      setResetCaptchaNonce((n) => n + 1);
      return;
    }
    setResetCodeStep(true);
  };

  /** مرحلهٔ دوم: کد + رمزِ تازه. */
  const applyResetSms = async () => {
    setResetLoading(true);
    setResetError(null);

    const result = await apiPost("/api/v1/auth/mobile/reset", {
      phone: resetPhone,
      code: resetCode,
      newPassword: resetNewPassword,
    });
    setResetLoading(false);

    if (!result.ok) {
      setResetError(result.errors.join("\n"));
      return;
    }
    setResetDone(true);
  };

  const sendReset = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError("ایمیل معتبر نیست");
      return;
    }
    setResetLoading(true);
    setResetError(null);

    // این endpoint همیشه موفق برمی‌گردد، حتی وقتی آن ایمیل حسابی ندارد —
    // عمدی، تا نشود با آن فهمید چه کسی در سایت حساب دارد. پس پیام «فرستاده
    // شد» هم همیشه همان است.
    const result = await apiPost("/api/v1/auth/forgot-password", {
      email: resetEmail,
      turnstileToken: resetCaptcha ?? undefined,
    });
    setResetLoading(false);

    if (!result.ok) {
      setResetError(result.errors.join("\n"));
      setResetCaptchaNonce((n) => n + 1);
      return;
    }

    setResetSent(true);
  };

  useEffect(() => {
    if (showOtp) {
      const timer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [showOtp, focusFirstNonce]);

  /* شمارشِ معکوسِ «ارسال دوباره».
     ⚠️ این فقط یک راهنمای بصری است؛ سقفِ واقعی سمتِ سرور است
     (`SMS_OTP_RESEND_COOLDOWN_SECONDS`). اگر کاربر صفحه را رفرش کند این
     شمارنده صفر می‌شود ولی سرور همچنان رد می‌کند — و همان‌جا پیامِ درست را
     می‌دهد. */
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  /** مرحلهٔ اول: درخواستِ کد. */
  const sendCode = async (mobile: string) => {
    setLoading(true);
    const result = await apiPost("/api/v1/auth/mobile/send-code", {
      phone: mobile,
      turnstileToken: mobileCaptcha ?? undefined,
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setLoading(false);
      // ⚠️ کپچا یک‌بارمصرف است: بدونِ ریست، تلاشِ دوم همیشه با «کپچا نامعتبر»
      // رد می‌شد و کاربر دلیلش را نمی‌فهمید.
      setMobileCaptchaNonce((n) => n + 1);
      return;
    }

    const data = result.data as { phoneMasked?: string | null } | undefined;
    setSentTo(data?.phoneMasked ?? null);
    setOtp(["", "", "", "", "", ""]);
    setShowOtp(true);
    setResendIn(90);
    setLoading(false);
  };

  const onMobileSubmit = async (data: MobileFormData) => {
    setError(null);

    if (!showOtp) {
      await sendCode(data.mobile);
      return;
    }

    // مرحلهٔ دوم: تأییدِ کد.
    const code = otp.join("");
    if (code.length < 6) {
      setError("کد شش‌رقمی را کامل وارد کنید.");
      return;
    }

    setLoading(true);
    const result = await apiPost("/api/v1/auth/mobile/verify", {
      phone: data.mobile,
      code,
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setOtp(["", "", "", "", "", ""]);
      setFocusFirstNonce((n) => n + 1);
      setLoading(false);
      return;
    }

    refreshCurrentUser();
    onSuccess(data.mobile);
    /* ⚠️ همان مقصدی که تبِ ایمیل می‌رود. اگر کاربر وسطِ خرید برای ورود آمده
       باشد، باید به همان‌جا برگردد و نه به صفحهٔ اولِ پنل. */
    router.push(returnTo);
    router.refresh();
  };

  const onEmailSubmit = async (data: EmailFormData) => {
    setError(null);
    setLoading(true);

    // سرور یک پیام واحد برای «ایمیل پیدا نشد» و «رمز غلط» می‌دهد، پس دیگر
    // لازم نیست اینجا متن خطا را بخوانیم و حدس بزنیم کدام حالت بوده — کاری که
    // نسخهٔ قبلی با includes("Invalid login credentials") می‌کرد و با هر
    // تغییر متن در Supabase می‌شکست.
    const result = await apiPost("/api/v1/auth/login", {
      email: data.email,
      password: data.password,
      turnstileToken: loginCaptcha ?? undefined,
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setLoading(false);
      setLoginCaptchaNonce((n) => n + 1);
      return;
    }

    refreshCurrentUser();

    // موفق: دکمه در حالت بارگذاری می‌ماند — داریم از صفحه خارج می‌شویم، پس
    // چیزی برای بازنشانی نیست و بازنشاندنش فقط باعث یک پرشِ لحظه‌ای می‌شود
    onSuccess(data.email);
    // مستقیم به مقصد، نه به `/panel` که خودش دوباره ریدایرکت می‌کند — آن پرشِ
    // اضافه یک رفت‌وبرگشتِ سرور بود که کاربر به‌صورت یک لحظه مکث می‌دیدش.
    /* ⚠️ اگر کاربر وسطِ خرید برای ورود آمده، باید به همان‌جا برگردد و نه به
       صفحهٔ اول پنل — وگرنه انتخابش را از دست می‌دهد و باید از نو شروع کند. */
    router.push(returnTo);
    router.refresh();
  };
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
    <form
      onSubmit={
        tab === "mobile"
          ? handleMobileSubmit(onMobileSubmit)
          : handleEmailSubmit(onEmailSubmit)
      }
      className=" glass relative z-20 rounded-xl mt-10 px-4 sm:px-8 pt-8 pb-4 w-[95%]
       text-sm sm:text-base sm:max-w-115"
    >
      <div
        className=" relative border border-primary/40 gap-x-4 bg-primary/10
       py-2 rounded-xl px-2 grid grid-cols-2 items-center text-center"
      >
        <span
          className={`absolute top-1 right-1 h-[calc(100%-8px)] w-[calc(50%-8px)]
                bg-primary rounded-xl transition-transform duration-500 ease-in-out
                ${tab === "mobile" ? "translate-x-0" : "-translate-x-[calc(100%+8px)]"}`}
        />
        <button
          type="button"
          onClick={() => {
            setTab("email");
            setShowOtp(false);
            setError(null);
          }}
          className={`relative z-10 py-2 rounded-xl transition-colors duration-300 ${
            tab === "email"
              ? " text-white dark:text-black"
              : " text-foreground"
          }`}
        >
          ایمیل
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("mobile");
            setShowOtp(false);
            setError(null);
          }}
          className={`relative z-10 py-2 rounded-xl transition-colors duration-300 ${
            tab === "mobile"
              ? " text-white dark:text-black"
              : " text-foreground"
          }`}
        >
          موبایل
        </button>
      </div>

      {tab === "mobile" && (
        <div>
          <div className=" mt-5">
            <label className=" text-sm text-muted-foreground">
              شمارۀ موبایل
            </label>
            <input
              {...registerMobile("mobile")}
              className=" text-left placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full"
              type="text"
              placeholder="0913 118 1234"
              disabled={showOtp}
            />
            {mobileErrors.mobile && (
              <p className=" text-xs sm:text-sm text-red-500 mt-1">
                {mobileErrors.mobile.message}
              </p>
            )}
          </div>
          {/* ⚠️ نقطه آخرِ جمله است و نه اولِ آن.

              تا امروز همین رشته با «.» شروع می‌شد. در ویرایشگر درست
              به نظر می‌آمد — ویرایشگر متنِ راست‌به‌چپ را راست‌به‌چپ نشان
              می‌دهد و نقطهٔ ابتدای رشته در انتهای خط می‌نشیند. ولی در
              مرورگر همان نقطه آغازِ منطقیِ جمله است و سمتِ راستِ خط رندر
              می‌شود — یعنی جمله با نقطه شروع می‌شد. */}
          {!showOtp && (
            <p className=" text-sm mt-1 text-muted-foreground">
              کد تأیید با پیامک برایت ارسال می‌شود.
            </p>
          )}

          {/* ⚠️ کلِ این بخش تازه است. پیش از این `showOtp` در state بود ولی
              هیچ‌جا رندر نمی‌شد — یعنی حتی اگر کد ارسال می‌شد، جایی برای
              واردکردنش وجود نداشت. */}
          {showOtp && (
            <div className="mt-5">
              {/* ⚠️ شماره حتماً داخلِ `<bdi>` می‌رود.

                  `maskPhone` «0901 *** 7757» می‌دهد: سه پاره که الگوریتمِ دوسویهٔ
                  یونیکد آن‌ها را عدد، خنثی، عدد می‌بیند. داخلِ یک پاراگرافِ
                  راست‌به‌چپ، خنثیِ وسط جهتِ پاراگراف را می‌گیرد و دو گروهِ رقم
                  جایِ هم را عوض می‌کنند: کاربر «7757 *** 0901» می‌دید.

                  دقیقاً همین اتفاق گزارش شد — و بدترین شکلِ خرابی است چون
                  کاربر فکر می‌کند شماره را اشتباه وارد کرده و از نو شروع می‌کند.

                  `<bdi>` دقیقاً برای همین هست: محتوایش یک جزیرهٔ جداست و در
                  چیدمانِ جملهٔ بیرون دخالت نمی‌کند. (`PhoneVerification` همین کار را
                  از قبل با `<span dir="ltr">` می‌کرد.) */}
              <p className="text-sm text-muted-foreground">
                کد شش‌رقمی به{" "}
                <bdi dir="ltr" className="panel-num">
                  {sentTo ?? "شمارهٔ شما"}
                </bdi>{" "}
                پیامک شد.
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
                      /* چسباندنِ کلِ کد از پیامک — کاری که تقریباً همه
                         می‌کنند. بدونِ این، فقط رقمِ اول جا می‌افتاد. */
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
                    setMobileCaptchaNonce((n) => n + 1);
                    void sendCode(getMobileValues().mobile);
                  }}
                  className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendIn > 0 ? `ارسال دوباره تا ${resendIn} ثانیه` : "ارسال دوبارهٔ کد"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtp(false);
                    setError(null);
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  تغییر شماره
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "email" && (
        <div>
          <div className=" mt-5">
            <label className=" text-sm text-muted-foreground">ایمیل</label>
            <input
              {...registerEmail("email")}
              className=" text-left placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full"
              type="text"
              placeholder="you@example.com"
            />
            {emailErrors.email && (
              <p className=" text-xs sm:text-sm text-red-500 mt-1">
                {emailErrors.email.message}
              </p>
            )}
          </div>
          <div className="mt-5">
            <div className=" flex items-center justify-between">
              <button
                type="button"
                onClick={openForgot}
                className=" text-sm cursor-pointer text-primary hover:underline"
              >
                فراموش کردی؟
              </button>
              <span className=" text-sm text-muted-foreground">رمز عبور</span>
            </div>
            <div className="border  px-4 py-3 border-muted-foreground/10 rounded-xl focus-within:border-primary flex-row-reverse flex items-center">
              <input
                {...registerEmail("password")}
                className=" pl-2 h-full text-left placeholder:text-right placeholder:text-muted-foreground/30 outline-none 
                 w-full"
                type={showPassword ? "text" : "password"}
                placeholder="*************"
              />
              <div
                onClick={() => {
                  setShowPassword((prev) => !prev);
                }}
                className=" cursor-pointer text-muted-foreground"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-5 cursor-pointer"
                  >
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                    <path
                      fillRule="evenodd"
                      d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="size-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l10.5 10.5a.75.75 0 1 0 1.06-1.06l-1.322-1.323a7.012 7.012 0 0 0 2.16-3.11.87.87 0 0 0 0-.567A7.003 7.003 0 0 0 4.82 3.76l-1.54-1.54Zm3.196 3.195 1.135 1.136A1.502 1.502 0 0 1 9.45 8.389l1.136 1.135a3 3 0 0 0-4.109-4.109Z"
                      clipRule="evenodd"
                    />
                    <path d="m7.812 10.994 1.816 1.816A7.003 7.003 0 0 1 1.38 8.28a.87.87 0 0 1 0-.566 6.985 6.985 0 0 1 1.113-2.039l2.513 2.513a3 3 0 0 0 2.806 2.806Z" />
                  </svg>
                )}
              </div>
            </div>
            {emailErrors.password && (
              <p className=" text-xs sm:text-sm text-red-500 mt-1">
                {emailErrors.password.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ حالا روی هر دو تب.
          تبِ موبایل تا دیروز هیچ درخواستی نمی‌فرستاد و کپچا آنجا بی‌فایده
          بود؛ حالا می‌فرستد — و آن درخواست *پیامک* است، یعنی پول. این
          پرهزینه‌ترین endpoint سایت است و بیشتر از بقیه به کپچا نیاز دارد.

          در مرحلهٔ واردکردنِ کد نشان داده نمی‌شود: آنجا دیگر پیامکی فرستاده
          نمی‌شود و کپچای اضافه فقط یک مانع است. */}
      {tab === "email" && (
        <div className="mt-5 flex justify-center">
          <TurnstileWidget onToken={setLoginCaptcha} resetSignal={loginCaptchaNonce} />
        </div>
      )}
      {tab === "mobile" && !showOtp && (
        <div className="mt-5 flex justify-center">
          <TurnstileWidget onToken={setMobileCaptcha} resetSignal={mobileCaptchaNonce} />
        </div>
      )}

      {error && (
        <p className=" text-xs sm:text-sm text-red-500 mt-3 text-center">
          {error}
        </p>
      )}

      {/* ⚠️ دکمهٔ اصلی همان `ShinyButton`ِ بقیهٔ سایت است و نه یک
          `<button>`ِ دستی با چند کلاسِ Tailwind.

          تا امروز این دکمه `bg-primary text-black rounded-xl p-2` بود — نه
          ارتفاعِ مشترکِ دکمه‌ها را داشت، نه سایهٔ زیرین، نه حلقهٔ فوکوس،
          نه `text-primary-foreground` (مشکیِ ثابت بود و در پوستهٔ روشن کم‌تقابل).
          صفحهٔ ورود اولین چیزی است که کاربرِ تازه می‌بیند؛ دکمه‌اش باید
          همانی باشد که در صفحهٔ اصلی دیده.

          ⚠️ و `type="submit"`ِ صریح: `ShinyButton` پیش‌فرض `type="button"` می‌گذارد
          (تا دکمه‌های داخلِ فرم تصادفی submit نکنند) و بدونِ این خط،
          Enter در فیلدِ شماره هیچ کاری نمی‌کرد. */}
      <ShinyButton type="submit" disabled={loading} className="mt-5 w-full">
        {loading
          ? "در حال ورود…"
          : tab === "mobile" && !showOtp
            ? "ارسال کد"
            : "ورود"}
      </ShinyButton>
      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            یا
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignInButton label="ورود با حساب گوگل" />
        </>
      )}

      <p className=" text-center mt-8">
        حساب کاربری نداری؟
        <span
          onClick={() => setIsLogin(false)}
          className=" text-primary cursor-pointer"
        >
          همین حالا بساز
        </span>
      </p>
    </form>

    {forgotOpen && (
      <OverlayPortal>
      <div
        dir="rtl"
        className="flex size-full items-center justify-center overflow-y-auto bg-black/40 px-4 backdrop-blur-sm"
        onClick={() => setForgotOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          {resetDone ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">رمز عبور عوض شد</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                حالا می‌توانی با رمز تازه وارد شوی.
                {" "}
                {/* ⚠️ این جمله لازم است: سرور همهٔ نشست‌ها را باطل می‌کند و
                    کاربری که روی گوشی‌اش هم وارد بوده، بیرون می‌افتد. بدونِ
                    گفتنش، آن را یک خرابی می‌بیند. */}
                برای امنیت، از همهٔ دستگاه‌های دیگر خارج شدی.
              </p>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="mt-5 min-h-11 w-full rounded-xl bg-primary font-bold text-black"
              >
                باشه
              </button>
            </div>
          ) : resetCodeStep ? (
            <>
              <h3 className="text-lg font-bold">رمز تازه</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                کدی که پیامک شد و رمز تازه‌ات را وارد کن.
              </p>
              <input
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="کد ۶ رقمی"
                className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-center tracking-[0.4em] outline-none focus:border-primary"
              />
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="رمز تازه"
                className="mt-3 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
              />
              {resetError && <p className="mt-2 text-xs text-red-500">{resetError}</p>}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetCodeStep(false)}
                  className="min-h-11 flex-1 rounded-xl border border-border text-sm font-medium text-muted-foreground"
                >
                  برگشت
                </button>
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={applyResetSms}
                  className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-black disabled:opacity-60"
                >
                  {resetLoading ? "در حال ثبت…" : "ثبت رمز تازه"}
                </button>
              </div>
            </>
          ) : resetSent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">لینک بازیابی ارسال شد</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                یک ایمیل حاوی لینک بازنشانی رمز عبور به <span dir="ltr" className="text-foreground">{resetEmail}</span> فرستادیم. صندوق ورودی (و پوشهٔ اسپم) را بررسی کن.
              </p>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="mt-5 min-h-11 w-full rounded-xl bg-primary font-bold text-black"
              >
                باشه
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold">بازیابی رمز عبور</h3>

              {/* انتخابِ راه. ⚠️ دو مسیرِ واقعاً متفاوت‌اند و نه دو شکلِ یک
                  چیز: ایمیل لینک می‌فرستد، پیامک کد. */}
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
                {(["email", "mobile"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setResetMode(m);
                      setResetError(null);
                    }}
                    className={`min-h-9 rounded-lg text-sm transition-colors ${
                      resetMode === m
                        ? "bg-primary font-bold text-black"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m === "email" ? "ایمیل" : "پیامک"}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {resetMode === "email"
                  ? "ایمیل حسابت را وارد کن تا لینک بازنشانی رمز برایت بفرستیم."
                  : "شمارهٔ موبایل حسابت را وارد کن تا کد بازنشانی برایت پیامک شود."}
              </p>

              {resetMode === "email" ? (
                <input
                  type="email"
                  dir="ltr"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
                />
              ) : (
                <input
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="0913 118 1234"
                  className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
                />
              )}
              <div className="mt-4 flex justify-center">
                <TurnstileWidget onToken={setResetCaptcha} resetSignal={resetCaptchaNonce} />
              </div>
              {resetError && <p className="mt-2 text-xs text-red-500">{resetError}</p>}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="min-h-11 flex-1 rounded-xl border border-border text-sm font-medium text-muted-foreground"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={resetMode === "email" ? sendReset : sendResetSms}
                  className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-black disabled:opacity-60"
                >
                  {resetLoading
                    ? "در حال ارسال…"
                    : resetMode === "email"
                      ? "ارسال لینک"
                      : "ارسال کد"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </OverlayPortal>
    )}
    </>
  );
}
