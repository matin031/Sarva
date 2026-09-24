"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import { loginSchema } from "@/lib/auth/schemas";
import GoogleSignInButton from "./GoogleSignInButton";
import TurnstileWidget from "@/components/UI/TurnstileWidget";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import AuthTabs, { type AuthTab } from "@/components/UI/auth/AuthTabs";
import MobileCodeForm from "@/components/UI/auth/MobileCodeForm";
import ForgotPasswordModal from "@/components/UI/auth/ForgotPasswordModal";
import PasswordField from "@/components/UI/auth/PasswordField";

/**
 * فرمِ **ورود** — دو تب: موبایل و ایمیل.
 *
 * ⚠️ این فایل تا دیروز ۸۰۰ خط بود و سه چیز را با هم انجام می‌داد: تب‌ها،
 * جریانِ کدِ پیامکی، و پنجرهٔ بازیابی رمز. هر سه حالا کامپوننتِ خودشان را
 * دارند (`components/UI/auth/`) و همان‌ها را فرمِ ثبت‌نام هم استفاده
 * می‌کند — که دلیلِ اصلیِ این جداسازی است: ورود و ثبت‌نام باید *دقیقاً*
 * یک رفتار داشته باشند، و تنها راهِ مطمئنش یک کد است.
 *
 * ⚠️ قالبِ رمز اینجا بررسی نمی‌شود (`loginSchema` عمداً قانونِ قالب ندارد):
 * اگر فرمِ ورود بگوید «رمز باید حداقل ۸ کاراکتر باشد»، به کسی که دارد رمز
 * حدس می‌زند گفته‌ایم رمزِ این حساب چه شکلی *نیست*. ضمناً کاربری که رمزش
 * را پیش از قوانینِ جدید ساخته باید بتواند وارد شود.
 */
type EmailFormData = z.infer<typeof loginSchema>;

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
  const [tab, setTab] = useState<AuthTab>("mobile");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  /** آخرین شماره‌ای که در تبِ موبایل تایپ شده — فقط برای پیش‌پُر کردنِ بازیابی. */
  const [lastPhone, setLastPhone] = useState("");

  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EmailFormData>({ resolver: zodResolver(loginSchema) });

  const onEmailSubmit = async (data: EmailFormData) => {
    setError(null);
    setLoading(true);

    /* سرور یک پیام واحد برای «ایمیل پیدا نشد» و «رمز غلط» می‌دهد، پس اینجا
       لازم نیست متنِ خطا خوانده و حدس زده شود کدام حالت بوده — کاری که
       نسخهٔ قدیمی با includes("Invalid login credentials") می‌کرد و با هر
       تغییرِ متن می‌شکست. */
    const result = await apiPost("/api/v1/auth/login", {
      email: data.email,
      password: data.password,
      turnstileToken: captcha ?? undefined,
    });

    if (!result.ok) {
      setError(result.errors.join("\n"));
      setLoading(false);
      setCaptchaNonce((n) => n + 1);
      return;
    }

    refreshCurrentUser();

    /* موفق: دکمه در حالتِ بارگذاری می‌ماند — داریم از صفحه خارج می‌شویم،
       پس چیزی برای بازنشانی نیست و بازنشاندنش فقط یک پرشِ لحظه‌ای می‌سازد. */
    onSuccess(data.email);
    /* ⚠️ اگر کاربر وسطِ خرید برای ورود آمده، باید به همان‌جا برگردد و نه به
       صفحهٔ اولِ پنل — وگرنه انتخابش را از دست می‌دهد. */
    router.push(returnTo);
    router.refresh();
  };

  return (
    <>
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
          <MobileCodeForm
            intent="login"
            returnTo={returnTo}
            onSuccess={onSuccess}
            onPhoneChange={setLastPhone}
          />
        ) : (
          <form onSubmit={handleSubmit(onEmailSubmit)} className="mt-5">
            <div>
              <label htmlFor="login-email" className="text-sm text-muted-foreground">
                ایمیل
              </label>
              <input
                {...register("email")}
                id="login-email"
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
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm text-muted-foreground">
                  رمز عبور
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="cursor-pointer text-sm text-primary hover:underline"
                >
                  فراموش کردی؟
                </button>
              </div>
              <div className="mt-1">
                <PasswordField
                  {...register("password")}
                  id="login-password"
                  autoComplete="current-password"
                  placeholder="*************"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.password.message}</p>
              )}
            </div>

            {/* وقتی کپچا خاموش باشد این هیچ چیزی رندر نمی‌کند و فضایی هم
                نمی‌گیرد. */}
            <div className="mt-5 flex justify-center">
              <TurnstileWidget onToken={setCaptcha} resetSignal={captchaNonce} />
            </div>

            {error && (
              <p className="mt-3 text-center text-xs whitespace-pre-line text-red-500 sm:text-sm">
                {error}
              </p>
            )}

            {/* ⚠️ `type="submit"`ِ صریح — `ShinyButton` پیش‌فرض
                `type="button"` می‌گذارد. */}
            <ShinyButton type="submit" disabled={loading} className="mt-5 w-full">
              {loading ? "در حال ورود…" : "ورود"}
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
            <GoogleSignInButton label="ورود با حساب گوگل" returnTo={returnTo} />
          </>
        )}

        {/* یک جمله برای هر دو تب — همان که همهٔ سایت‌ها می‌گویند.
            ⚠️ `<button>` و نه `<span onClick>`: قبلاً با کیبورد در دسترس نبود. */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          حساب کاربری نداری؟{" "}
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className="cursor-pointer font-bold text-primary hover:underline"
          >
            ثبت‌نام
          </button>
        </p>
      </div>

      {forgotOpen && (
        <ForgotPasswordModal
          onClose={() => setForgotOpen(false)}
          /* کسی که با موبایل وارد می‌شود، رمزش را هم با موبایل می‌خواهد. */
          defaultMode={tab === "mobile" ? "mobile" : "email"}
          defaultEmail={getValues("email") || ""}
          defaultPhone={lastPhone}
        />
      )}
    </>
  );
}
