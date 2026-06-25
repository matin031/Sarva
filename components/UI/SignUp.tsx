"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";

const mobileSchema = z.object({
  mobile: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09121234567)"),
  name: z
    .string()
    .min(3, "نام الزامی است")
    .regex(/^[\u0600-\u06FF\s]+$/, "نام باید فقط به فارسی وارد شود"),
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

export default function SignUp({
  onSuccess,
  setIsLogin,
}: {
  onSuccess: (identifier: string) => void;
  setIsLogin: (value: boolean) => void;
}) {
  const [tab, setTab] = useState<"email" | "mobile">("mobile");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register: registerMobile,
    handleSubmit: handleMobileSubmit,
    formState: { errors: mobileErrors, isSubmitting: isMobileSubmitting },
  } = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
  });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isEmailSubmitting },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  useEffect(() => {
    if (showOtp) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showOtp]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onMobileSubmit = (data: MobileFormData) => {
    if (!showOtp) {
      setShowOtp(true);
    } else {
      onSuccess(data.mobile);
    }
  };

  const onEmailSubmit = (data: EmailFormData) => {
    onSuccess(data.email);
  };

  return (
    <form
      onSubmit={
        tab === "mobile"
          ? handleMobileSubmit(onMobileSubmit)
          : handleEmailSubmit(onEmailSubmit)
      }
      className=" glass relative z-20 rounded-xl mt-10 px-8 pt-8 pb-4 w-[95%] text-sm sm:text-base  sm:max-w-115"
    >
      <div className=" mb-5">
        <label className=" text-sm text-muted-foreground">
          نام و نام خانوادگی
        </label>
        <input
          {...registerMobile("name")}
          className=" text-right 
                placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4
                 py-3 border border-muted-foreground/10 rounded-xl w-full"
          type="text"
          placeholder="سعدی شیرازی"
          disabled={showOtp}
        />
        {mobileErrors.name && (
          <p className=" text-xs sm:text-sm text-red-500 mt-1">
            {mobileErrors.name.message}
          </p>
        )}
      </div>
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
              className=" text-left 
                placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4
                 py-3 border border-muted-foreground/10 rounded-xl w-full"
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

          {showOtp && (
            <div className=" flex justify-center gap-3 mt-6" dir="ltr">
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
                  className=" w-13 h-14 text-center text-2xl font-bold rounded-xl border
                        border-muted-foreground/10 bg-background outline-none
                        focus:border-primary transition-colors duration-200
                        otp-pop"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "email" && (
        <div>
          <div className="  mt-5">
            <label className=" text-sm text-muted-foreground">ایمیل</label>
            <input
              {...registerEmail("email")}
              className=" text-left 
                placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4
                 py-3 border border-muted-foreground/10 rounded-xl w-full"
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
            <span className=" text-sm text-muted-foreground">رمز عبور</span>

            <input
              {...registerEmail("password")}
              className=" text-left 
                placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4
                 py-3 border border-muted-foreground/10 rounded-xl w-full"
              type="password"
              placeholder="********"
            />
            {emailErrors.password && (
              <p className=" text-xs sm:text-sm text-red-500 mt-1">
                {emailErrors.password.message}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isMobileSubmitting || isEmailSubmitting}
        className=" bg-primary text-black rounded-xl p-2 w-full font-bold mt-5"
      >
        {tab === "mobile" && showOtp ? "تأیید کد" : "ثبت نام"}
      </button>
      <p className=" text-center mt-8">
        حساب کاربری داری؟
        <span
          onClick={() => {
            setIsLogin(true);
          }}
          className=" text-primary cursor-pointer"
        >
          وارد شو
        </span>
      </p>
    </form>
  );
}
