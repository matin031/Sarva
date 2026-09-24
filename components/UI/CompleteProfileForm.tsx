"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserRound } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser, clearCurrentUser } from "@/lib/auth/use-current-user";
import { firstNameField, lastNameField } from "@/lib/profile/name";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";

/**
 * آخرین قدمِ ساختِ حساب: نام و نام خانوادگی.
 *
 * ⚠️ قوانین از `lib/profile/schemas.ts` می‌آیند و نه از یک کپیِ محلی — همان
 * درسی که بالای `SignUp.tsx` نوشته شده: دو نسخهٔ جدا از یک قانون بالاخره از
 * هم می‌افتند و آن‌وقت یا فرم چیزی را رد می‌کند که سرور می‌پذیرد یا برعکس.
 *
 * ⚠️ «خروج از حساب» عمداً اینجاست. این صفحه یک بن‌بست است — هر مسیرِ دیگری
 * به همین‌جا برمی‌گردد — و کاربری که پشیمان شده باید راهی بیرون داشته باشد
 * که «بستنِ تب» نباشد.
 */
const schema = z.object({ firstName: firstNameField, lastName: lastNameField });
type FormData = z.infer<typeof schema>;

export default function CompleteProfileForm({
  defaultValues,
  returnTo,
}: {
  defaultValues: { firstName: string; lastName: string };
  returnTo: string;
  /** هنوز پاس داده می‌شود ولی دیگر خوانده نمی‌شود: متنِ «حسابت با شمارهٔ
   *  موبایل ساخته شد؛ فقط نامت مانده» برداشته شد. */
  via?: "email" | "phone";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);

    const saved = await apiPost("/api/v1/auth/complete-profile", data);

    if (!saved.ok) {
      setError(saved.errors.join("\n"));
      setLoading(false);
      return;
    }

    // هدر و سایدبار باید همین حالا نامِ تازه را ببینند.
    refreshCurrentUser();

    /* ⚠️ `router.refresh()` پیش از `push` و نه بعدش.
       گیتِ `proxy.ts` از کوکیِ دسترسی می‌خواند و مسیرِ ذخیره همین الان
       کوکیِ تازه را ست کرده. بدونِ باطل کردنِ کشِ روترِ کلاینت، ناوبریِ
       بعدی ممکن است از نسخهٔ کش‌شدهٔ قبلی بیاید — یعنی همان صفحه‌ای که
       هنوز ریدایرکت می‌شد. */
    router.refresh();
    router.push(returnTo);
  };

  const signOut = async () => {
    setLeaving(true);
    await apiPost("/api/v1/auth/logout");
    clearCurrentUser();
    router.push("/auth");
    router.refresh();
  };

  return (
    <div className="mx-auto mt-10 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-extrabold text-foreground">تکمیل ثبت‌نام</h1>

      <form
        dir="rtl"
        onSubmit={handleSubmit(onSubmit)}
        className="glass relative z-20 mt-10 w-[95%] rounded-xl px-8 pt-8 pb-4 text-sm sm:max-w-115 sm:text-base"
      >
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/6 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <UserRound aria-hidden className="size-5" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            این نام روی کارنامه‌ها، سروده‌های سروا کلاب و کلاس‌هایت دیده
            می‌شود. هر وقت خواستی از «تنظیمات» عوضش کن.
          </p>
        </div>

        <div className="mb-5">
          <label htmlFor="cp-first" className="text-sm text-muted-foreground">
            نام
          </label>
          <input
            {...register("firstName")}
            id="cp-first"
            autoComplete="given-name"
            autoFocus
            className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-right outline-none placeholder:text-muted-foreground/30 focus:border-primary"
            type="text"
            placeholder="سعدی"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.firstName.message}</p>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="cp-last" className="text-sm text-muted-foreground">
            نام خانوادگی
          </label>
          <input
            {...register("lastName")}
            id="cp-last"
            autoComplete="family-name"
            className="w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-right outline-none placeholder:text-muted-foreground/30 focus:border-primary"
            type="text"
            placeholder="شیرازی"
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-500 sm:text-sm">{errors.lastName.message}</p>
          )}
        </div>

        {error && (
          <p className="mt-1 text-center text-xs whitespace-pre-line text-red-500 sm:text-sm">
            {error}
          </p>
        )}

        <ShinyButton type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "در حال ذخیره…" : "ادامه"}
        </ShinyButton>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <button
            type="button"
            onClick={signOut}
            disabled={leaving}
            className="cursor-pointer text-primary hover:underline disabled:opacity-60"
          >
            {leaving ? "در حال خروج…" : "خروج از حساب"}
          </button>
        </p>
      </form>
    </div>
  );
}
