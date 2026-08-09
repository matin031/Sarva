"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { apiPatch, apiPost } from "@/lib/api/client";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import { useEffect } from "react";
import { passwordField } from "@/lib/auth/schemas";

function AccountSettings() {
  const { user } = useCurrentUser();
  const [currentName, setCurrentName] = useState("");
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // نام از هوک می‌آید ولی در state محلی هم نگه داشته می‌شود، چون بعد از ذخیره
  // بلافاصله به‌روز می‌شود بی‌آنکه منتظر رفت‌وبرگشت بعدی بمانیم.
  useEffect(() => {
    if (user) setCurrentName(user.fullName ?? "");
  }, [user]);

  const nameSchema = z.object({
    name: z
      .string()
      .min(3, "حداقل 3 کاراکتر وارد نمایید")
      .max(12, "حداکثر 12 کاراکتر وارد نمایید")
      .regex(/^[\u0600-\u06FF\s]+$/, "نام باید فقط به فارسی وارد شود"),
  });

  const passwordSchema = z
    .object({
      // رمز *فعلی* فقط باید خالی نباشد — همان کاری که changePasswordSchema در
      // سرور می‌کند. اعمال قوانین جدید روی آن، کاربری را که رمزش را قبل از
      // تغییر قوانین ساخته از تغییر دادنش محروم می‌کرد.
      prevPassword: z.string().min(1, "رمز فعلی را وارد کنید"),
      // رمز جدید از همان شِمای سرور می‌آید تا این دو هرگز از هم نیفتند.
      newPassword: passwordField,
      confirmNewPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "تکرار رمز عبور با رمز عبور جدید مطابقت ندارد",
      path: ["confirmNewPassword"],
    });

  type ChangeNameSchema = z.infer<typeof nameSchema>;
  type ChangePasswordForm = z.infer<typeof passwordSchema>;

  const nameForm = useForm<ChangeNameSchema>({
    resolver: zodResolver(nameSchema),
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const changeNameSubmit = async (data: ChangeNameSchema) => {
    setNameMessage(null);
    setNameLoading(true);
    try {
      const result = await apiPatch("/api/v1/auth/profile", { name: data.name });

      if (!result.ok) {
        setNameMessage(result.errors.join("\n"));
        return;
      }

      setCurrentName(data.name);
      // هدر نام کاربر را نشان می‌دهد؛ بدون این تا رفرش بعدی نام قدیمی می‌ماند.
      refreshCurrentUser();
      nameForm.reset();
      setNameMessage("نام با موفقیت تغییر کرد");
    } finally {
      setNameLoading(false);
    }
  };

  const changePasswordSubmit = async (data: ChangePasswordForm) => {
    setPasswordMessage(null);
    setPasswordLoading(true);
    try {
      // یک درخواست، نه سه تا.
      //
      // نسخهٔ قبلی برای تأیید رمز فعلی، دوباره signInWithPassword می‌زد — یعنی
      // یک ورودِ کامل وسط تغییر رمز. حالا سرور رمز فعلی را چک، رمز تازه را
      // ذخیره، همهٔ سشن‌های دیگر را باطل، و برای همین دستگاه سشن تازه صادر
      // می‌کند؛ همه در یک تماس.
      const result = await apiPost("/api/v1/auth/change-password", {
        currentPassword: data.prevPassword,
        newPassword: data.newPassword,
      });

      if (!result.ok) {
        setPasswordMessage(result.errors.join("\n"));
        return;
      }

      passwordForm.reset();
      setPasswordMessage("رمز عبور با موفقیت تغییر کرد");
    } finally {
      setPasswordLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState({
    prevPass: false,
    newPass: false,
    confirmPass: false,
  });

  return (
    <div
      className="
    rounded-xl"
    >
      <div className="flex flex-col  justify-between items-start  *:w-full gap-10 lg:gap-22">
        <form
          className=" glass relative rounded-xl z-20 p-4
           "
          onSubmit={nameForm.handleSubmit(changeNameSubmit)}
        >
          <h3 className="text-lg">تغییر نام</h3>
          <div className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground">نام فعلی</label>
              <input
                disabled
                className="placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full opacity-60"
                type="text"
                value={currentName}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">نام جدید</label>
              <input
                className="placeholder:text-muted-foreground/30 outline-none focus:border-primary px-4 py-3 border border-muted-foreground/10 rounded-xl w-full"
                type="text"
                {...nameForm.register("name")}
                placeholder="نام جدید خود را وارد نمایید"
              />
              {nameForm.formState.errors.name && (
                <p className="text-xs sm:text-sm text-red-500 mt-1">
                  {nameForm.formState.errors.name.message}
                </p>
              )}
            </div>
            {nameMessage && (
              <p
                className={`text-xs sm:text-sm text-center ${
                  nameMessage.includes("موفقیت")
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {nameMessage}
              </p>
            )}
            <button
              disabled={nameLoading}
              className="text-white bg-primary py-2 w-full rounded-xl dark:text-card font-semibold mt-10 disabled:opacity-60"
            >
              {nameLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </button>
          </div>
        </form>
        <form
          className=" glass relative rounded-xl z-20 p-4 "
          dir="ltr"
          onSubmit={passwordForm.handleSubmit(changePasswordSubmit)}
        >
          <h3 className="text-lg">تغییر رمز عبور</h3>
          <div className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground">
                رمز عبور فعلی
              </label>
              <div className="border px-4 py-3 border-muted-foreground/10 rounded-xl focus-within:border-primary flex-row-reverse flex items-center">
                <input
                  {...passwordForm.register("prevPassword")}
                  className="pl-2 h-full text-left placeholder:text-right placeholder:text-muted-foreground/30 outline-none w-full"
                  type={showPassword.prevPass ? "text" : "password"}
                  placeholder="*************"
                />
                <div
                  onClick={() => {
                    setShowPassword((prev) => ({
                      ...prev,
                      prevPass: !prev.prevPass,
                    }));
                  }}
                  className="cursor-pointer text-muted-foreground"
                >
                  {showPassword.prevPass ? (
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
              {passwordForm.formState.errors.prevPassword && (
                <p className="text-xs sm:text-sm text-red-500 mt-1">
                  {passwordForm.formState.errors.prevPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                رمز عبور جدید
              </label>
              <div className="border px-4 py-3 border-muted-foreground/10 rounded-xl focus-within:border-primary flex-row-reverse flex items-center">
                <input
                  {...passwordForm.register("newPassword")}
                  className="pl-2 h-full text-left placeholder:text-right placeholder:text-muted-foreground/30 outline-none w-full"
                  type={showPassword.newPass ? "text" : "password"}
                  placeholder="*************"
                />
                <div
                  onClick={() => {
                    setShowPassword((prev) => ({
                      ...prev,
                      newPass: !prev.newPass,
                    }));
                  }}
                  className="cursor-pointer text-muted-foreground"
                >
                  {showPassword.newPass ? (
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
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs sm:text-sm text-red-500 mt-1">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                تکرار رمز عبور
              </label>
              <div className="border px-4 py-3 border-muted-foreground/10 rounded-xl focus-within:border-primary flex-row-reverse flex items-center">
                <input
                  {...passwordForm.register("confirmNewPassword")}
                  className="pl-2 h-full text-left placeholder:text-right placeholder:text-muted-foreground/30 outline-none w-full"
                  type={showPassword.confirmPass ? "text" : "password"}
                  placeholder="*************"
                />
                <div
                  onClick={() => {
                    setShowPassword((prev) => ({
                      ...prev,
                      confirmPass: !prev.confirmPass,
                    }));
                  }}
                  className="cursor-pointer text-muted-foreground"
                >
                  {showPassword.confirmPass ? (
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

              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-xs sm:text-sm text-red-500 mt-1">
                  {passwordForm.formState.errors.confirmNewPassword.message}
                </p>
              )}
            </div>
            {passwordMessage && (
              <p
                className={`text-xs sm:text-sm text-center ${
                  passwordMessage.includes("موفقیت")
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {passwordMessage}
              </p>
            )}
            <button
              disabled={passwordLoading}
              className="bg-primary py-2 w-full rounded-xl text-white dark:text-card font-semibold mt-10 disabled:opacity-60"
            >
              {passwordLoading ? "در حال ذخیره..." : "ذخیره رمز عبور جدید"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountSettings;
