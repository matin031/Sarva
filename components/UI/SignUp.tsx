"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const emailSchema = z.object({
  name: z
    .string()
    .min(3, "نام الزامی است")
    .regex(/^[\u0600-\u06FF\s]+$/, "نام باید فقط به فارسی وارد شود"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "ایمیل معتبر نیست!"),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(16, "رمز عبور باید حداکثر ۱۶ کاراکتر باشد")
    .regex(
      /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,
      "رمز عبور فقط می‌تواند شامل حروف انگلیسی، اعداد و علائم باشد",
    ),
});
type EmailFormData = z.infer<typeof emailSchema>;

export default function SignUp({
  onSuccess,
  setIsLogin,
}: {
  onSuccess: (identifier: string) => void;
  setIsLogin: (value: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingData, setPendingData] = useState<EmailFormData | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (data: EmailFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "خطایی رخ داد");
        return;
      }

      setPendingEmail(data.email);
      setPendingData(data);
      setShowOtp(true);
    } catch {
      setError("خطای اتصال. اینترنت خود را بررسی کنید");
    } finally {
      setLoading(false);
    }
  };

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

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("کد ۶ رقمی را کامل وارد کنید");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });

      const verifyResult = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyResult.error || "کد اشتباه است");
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: pendingEmail,
          password: pendingData!.password,
          options: {
            data: { full_name: pendingData!.name },
          },
        });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("این ایمیل قبلاً ثبت شده. از صفحه ورود وارد شوید");
        } else if (signUpError.message.includes("password")) {
          setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
        } else {
          setError("خطا در ثبت‌نام. دوباره تلاش کنید");
        }
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pendingEmail,
        password: pendingData!.password,
      });

      if (signInError) {
        setError("ثبت‌نام موفق بود ولی خطا در ورود: " + signInError.message);
        setLoading(false);
        return;
      }

      // success: keep the button in its loading state until navigation
      // to /panel actually happens
      onSuccess(pendingEmail);
      router.push("/panel");
      router.refresh();
    } catch {
      setError("خطای اتصال. اینترنت خود را بررسی کنید");
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="glass relative z-20 rounded-xl mt-10 px-8 py-10 w-[95%] sm:max-w-115 text-center flex flex-col items-center gap-4">
        <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-8 text-primary"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold">کد تأیید را وارد کن</h2>
        <p dir="rtl" className="text-muted-foreground text-sm line-clamp-1">
          کد 6 رقمی به <span className="text-primary">{pendingEmail}</span>{" "}
          ارسال شد
        </p>

        <div className="flex justify-center gap-2 mt-2" dir="ltr">
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
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2
                border-muted-foreground/10 bg-background outline-none
                focus:border-primary transition-colors duration-200"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleVerifyOtp}
          disabled={loading}
          className="bg-primary text-black rounded-xl px-8 py-2 font-bold mt-2 disabled:opacity-60 w-full"
        >
          {loading ? "...در حال تأیید" : "تأیید"}
        </button>

        <button
          onClick={() => {
            setShowOtp(false);
            setOtp(["", "", "", "", "", ""]);
          }}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          بازگشت
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass relative z-20 rounded-xl mt-10 px-8 pt-8 pb-4 w-[95%] text-sm sm:text-base sm:max-w-115"
    >
      <div className="mb-5">
        <label className="text-sm text-muted-foreground">
          نام و نام خانوادگی
        </label>
        <input
          {...register("name")}
          className="text-right placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full"
          type="text"
          placeholder="سعدی شیرازی"
        />
        {errors.name && (
          <p className="text-xs sm:text-sm text-red-500 mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="mb-5">
        <label className="text-sm text-muted-foreground">ایمیل</label>
        <input
          {...register("email")}
          className="text-left placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full"
          type="text"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-xs sm:text-sm text-red-500 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="mb-5">
        <label className="text-sm text-muted-foreground">رمز عبور</label>
        <div className="border  px-4 py-3 border-muted-foreground/10 rounded-xl focus-within:border-primary flex-row-reverse flex items-center">
          <input
            {...register("password")}
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
        {errors.password && (
          <p className="text-xs sm:text-sm text-red-500 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs sm:text-sm text-red-500 mt-1 text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-black rounded-xl p-2 w-full font-bold mt-2 disabled:opacity-60"
      >
        {loading ? "...در حال تأیید" : "دریافت کد تأیید"}
      </button>

      <p className="text-center mt-8">
        حساب کاربری داری؟
        <span
          onClick={() => setIsLogin(true)}
          className="text-primary cursor-pointer"
        >
          وارد شو
        </span>
      </p>
    </form>
  );
}
