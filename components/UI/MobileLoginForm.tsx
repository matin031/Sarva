"use client";
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
  onSuccess,
  setIsLogin,
}: {
  onSuccess: (identifier: string) => void;
  setIsLogin: (value: boolean) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "mobile">("mobile");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register: registerMobile,
    handleSubmit: handleMobileSubmit,
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
  const [loginCaptchaNonce, setLoginCaptchaNonce] = useState(0);
  const [resetCaptcha, setResetCaptcha] = useState<string | null>(null);
  const [resetCaptchaNonce, setResetCaptchaNonce] = useState(0);

  const openForgot = () => {
    setResetEmail(getEmailValues("email") || "");
    setResetError(null);
    setResetSent(false);
    setForgotOpen(true);
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
  }, [showOtp]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const onMobileSubmit = async (data: MobileFormData) => {
    setError(null);
    if (!showOtp) {
      setLoading(true);

      setError("ورود با موبایل هنوز فعال نشده. از ایمیل استفاده کنید");
      setLoading(false);
      return;
    }
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
    router.push("/panel/home");
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
              : " text-black dark:text-white"
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
              : " text-black dark:text-white"
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
          <p className=" text-sm mt-1 text-muted-foreground">
            .کد تأیید با پیامک برایت ارسال می‌شود
          </p>
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

      {/* فقط روی تبِ ایمیل: تبِ موبایل هنوز هیچ درخواستی به سرور نمی‌فرستد،
          پس کپچا آنجا فقط یک مانع بی‌فایده بود. وقتی کپچا خاموش باشد این
          هیچ چیزی رندر نمی‌کند. */}
      {tab === "email" && (
        <div className="mt-5 flex justify-center">
          <TurnstileWidget onToken={setLoginCaptcha} resetSignal={loginCaptchaNonce} />
        </div>
      )}

      {error && (
        <p className=" text-xs sm:text-sm text-red-500 mt-3 text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className=" bg-primary text-black rounded-xl p-2 w-full font-bold mt-5 disabled:opacity-60"
      >
        {loading ? "...در حال ورود" : "ورود"}
      </button>
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
          {resetSent ? (
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
              <p className="mt-1 text-sm text-muted-foreground">
                ایمیل حسابت را وارد کن تا لینک بازنشانی رمز برایت بفرستیم.
              </p>
              <input
                type="email"
                dir="ltr"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-4 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none focus:border-primary"
              />
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
                  onClick={sendReset}
                  className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-bold text-black disabled:opacity-60"
                >
                  {resetLoading ? "در حال ارسال…" : "ارسال لینک"}
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
