"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const mobileSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09121234567)"),
});
type MobileFormData = z.infer<typeof mobileSchema>;

const emailSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "ایمیل معتبر نیست!"),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(16, "رمز عبور باید حداکثر ۱۶ کاراکتر باشد"),
});
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
    formState: { errors: emailErrors },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("ایمیل یا رمز عبور اشتباه است");
        } else if (error.message.includes("Email not confirmed")) {
          setError("لطفاً ایمیل خود را تأیید کنید");
        } else {
          setError("خطایی رخ داد. دوباره تلاش کنید");
        }
        setLoading(false);
        return;
      }

      // success: keep the button in its loading state — we're about to
      // navigate away, so there's nothing to reset, and resetting here
      // would flash the button back before the route actually changes
      onSuccess(data.email);
      router.push("/panel");
      router.refresh();
    } catch {
      setError("خطای اتصال. اینترنت خود را بررسی کنید");
      setLoading(false);
    }
  };
  const [showPassword, setShowPassword] = useState(false);

  return (
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
              <span className=" text-sm cursor-pointer text-primary">
                فراموش کردی؟
              </span>
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
  );
}
