"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { AnimatedSelect } from "@/components/UI/kit/animated-select";
import { apiPatch } from "@/lib/api/client";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import type { AuthUser } from "@/lib/auth/types";
import { PROVINCES, citiesOf } from "@/lib/geo";
import {
  GRADES,
  GRADE_LABEL,
  profileSchema,
  usableCityId,
  type ProfileFormValues,
  type ProfileInput,
} from "@/lib/profile/schemas";
import { cn } from "@/lib/cn";
import styles from "./panel-design.module.css";
import AvatarField from "./AvatarField";

/**
 * تکمیل پروفایل — بندهای ۲ و ۳.
 *
 * ⚠️ این فرم جای «تغییر نام» را در `AccountSettings` گرفت و نه اینکه کنارش
 * نشست. دو فرم که هر دو نام را می‌نویسند، یعنی کاربر نمی‌داند کدام را پر
 * کند و کدام برنده است.
 *
 * ── چرا همه‌چیز در یک فرم ──────────────────────────────────────────────────
 * ⚠️ نام و نام خانوادگی اجباری‌اند و بقیه اختیاری، ولی همه با یک دکمه ذخیره
 * می‌شوند.
 *
 * وسوسه‌اش این بود که هر بخش دکمهٔ خودش را داشته باشد (مثل کارت‌های
 * `AccountSettings`). غلط بود: `PATCH /profile` کلِ پروفایل را می‌نویسد و
 * نه فیلدهای فرستاده‌شده را — یعنی ذخیرهٔ «فقط پایه» استان و شهر را پاک
 * می‌کرد. آن رفتار عمدی است (توضیحش در `lib/profile/queries.ts`: فهرستِ
 * ستون‌ها بسته است تا هیچ کلیدِ ناخواسته‌ای به UPDATE نرسد) و فرم باید با
 * آن بخواند، نه برعکس.
 *
 * ⚠️ تصویر پروفایل تنها استثناست و دکمهٔ خودش را دارد، چون مسیرش جداست
 * (`multipart` در برابر JSON). `AvatarField` خودش ذخیره می‌کند.
 */

/** ⚠️ `undefined` و نه `""` برای انتخابگرهای اختیاری — `""` را شِما به
 *  `null` تبدیل می‌کند و همان چیزی است که سرور «پاک کن» می‌فهمد. هر دو
 *  درست کار می‌کنند، ولی یکدست بودنشان یعنی مقدارِ اولیه و مقدارِ پاک‌شده
 *  از یک جنس‌اند. */
function initialValues(user: AuthUser): ProfileFormValues {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    provinceId: user.provinceId,
    /* ⚠️ `usableCityId` و نه مستقیم `user.cityId`.

       فهرستِ مکان‌ها از «شهرستان» به «شهر» رفت و ۸۶ شناسهٔ قدیمی دیگر در
       فهرست نیستند. اگر یکی از آن‌ها خام وارد فرم می‌شد، کاربر در یک بن‌بست
       می‌افتاد: انتخابگر «انتخاب کنید» نشان می‌داد (چون گزینه‌ای با آن
       مقدار نیست) ولی همان مقدار موقعِ ذخیره فرستاده و رد می‌شد — خطایی
       زیرِ فیلدی که خالی به نظر می‌رسید. چراییِ کامل کنارِ خودِ تابع در
       `lib/profile/schemas.ts`. */
    cityId: usableCityId(user.provinceId, user.cityId),
    school: user.school,
    grade: user.grade,
    desiredRole: user.desiredRole,
  };
}

export default function ProfileForm() {
  const { user, loading } = useCurrentUser();
  const [saved, setSaved] = useState(false);

  /* ⚠️ سه آرگومانِ نوعی و نه یکی.
     react-hook-form مقدارهایی را که فرم *نگه می‌دارد* با چیزی که پس از
     اعتبارسنجی بیرون می‌آید یکی نمی‌گیرد، و اینجا واقعاً یکی نیستند: یک
     `<select>` خالی رشتهٔ `""` است و شِما آن را به `null` تبدیل می‌کند.
     توضیحِ کامل کنارِ `ProfileFormValues` در `lib/profile/schemas.ts`. */
  const form = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    // ⚠️ `values` و نه `defaultValues`: کاربر با یک درخواستِ ناهمگام
    // می‌آید، پس در اولین رندر `undefined` است. با `defaultValues` فرم برای
    // همیشه خالی می‌ماند و کاربر فکر می‌کند هیچ‌چیزی ذخیره نشده بود.
    values: user ? initialValues(user) : undefined,
  });

  /* ⚠️ `useWatch` و نه `form.watch()`.
     آن یکی در هر رندر یک تابعِ تازه برمی‌گرداند و کامپایلرِ React
     نمی‌تواند این کامپوننت را memo کند (هشدارِ
     `react-hooks/incompatible-library`). `useWatch` یک اشتراکِ واقعی
     است: فقط همین فیلد را دنبال می‌کند و با تغییرش رندر می‌شود. */
  const provinceId = useWatch({ control: form.control, name: "provinceId" });

  // ⚠️ فهرستِ شهر با `useMemo`: بدونِ آن، هر تایپ در فیلدِ نام یک آرایهٔ
  // تازهٔ پنجاه‌تایی می‌ساخت و کلِ `<select>` دوباره رندر می‌شد.
  const cities = useMemo(() => citiesOf(provinceId), [provinceId]);
  const desiredRole = useWatch({ control: form.control, name: "desiredRole" });

  /* ⚠️ هم نقشِ *تأییدشده* و هم نقشِ *انتخاب‌شده*.

     دبیرِ تأییدشده اصلاً `RoleChoice` را نمی‌بیند (بالای آن کامپوننت
     توضیح داده شده)، پس `desiredRole` برایش هر چیزی می‌تواند باشد — حتی
     `student`، اگر حسابش از آن راه شروع شده بود. تکیه کردن به یکی از این
     دو، برای نیمی از دبیرها فیلد را نگه می‌داشت. */
  const hideGrade = user?.role === "teacher" || desiredRole === "teacher";

  /* ⚠️ مقدارِ پایه همزمان با پنهان شدنِ فیلد پاک می‌شود.

     `PATCH /profile` کلِ پروفایل را می‌نویسد و نه فقط فیلدهای دیده‌شده، پس
     یک پایهٔ جامانده در state بی‌صدا ذخیره می‌شد. `shouldDirty` هم لازم
     است، وگرنه اگر کاربر فقط نقش را عوض کند و ذخیره بزند، همان مقدارِ
     قدیمی می‌ماند. */
  useEffect(() => {
    if (hideGrade && form.getValues("grade")) {
      form.setValue("grade", null, { shouldDirty: true });
    }
  }, [hideGrade, form]);

  const save = useMutation({
    mutationFn: async (data: ProfileInput) => {
      const result = await apiPatch("/api/v1/auth/profile", data);
      // خطای API یک پاسخِ موفق با `ok:false` است، نه throw. تبدیلش اینجا
      // انجام می‌شود تا `isError` در React Query معنی داشته باشد.
      if (!result.ok) throw new Error(result.errors.join(" "));
    },
    onSuccess: () => {
      setSaved(true);
      // نام و تصویرِ کاربر در سایدبار و هدر دیده می‌شوند؛ بدونِ این، تا
      // رفرشِ بعدی مقدارِ قدیمی می‌ماند. و مهم‌تر: بخشِ «فعال‌سازی حساب
      // دبیر» به `desiredRole` نگاه می‌کند و باید همین حالا ظاهر شود.
      refreshCurrentUser();
    },
  });

  if (loading) {
    return (
      <Card data-tone="lilac">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          در حال بارگذاری پروفایل…
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  const errors = form.formState.errors;

  return (
    <Card data-tone="lilac">
      <form
        onSubmit={form.handleSubmit((d) => {
          setSaved(false);
          save.mutate(d);
        })}
        noValidate
      >
        <div className={styles.formIntro}>
          <span className={styles.sticker}>
            <UserRound aria-hidden className="size-5" />
          </span>
          <div>
            <h2>تکمیل پروفایل</h2>
            <p>فقط نام و نام خانوادگی اجباری است.</p>
          </div>
        </div>

        <CardContent className="flex flex-col gap-5">
          <AvatarField />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام" htmlFor="first-name" error={errors.firstName?.message}>
              <Input
                id="first-name"
                autoComplete="given-name"
                placeholder="مثلاً مهدی"
                aria-invalid={!!errors.firstName}
                {...form.register("firstName")}
              />
            </Field>

            <Field label="نام خانوادگی" htmlFor="last-name" error={errors.lastName?.message}>
              <Input
                id="last-name"
                autoComplete="family-name"
                placeholder="مثلاً رضایی"
                aria-invalid={!!errors.lastName}
                {...form.register("lastName")}
              />
            </Field>

            {/* ⚠️ این سه تا با `Controller` وصل می‌شوند و نه `register`:
                `AnimatedSelect` یک `<select>`ِ بومی نیست، پس نه `ref` را
                می‌شود به آن داد و نه `event.target.value` را از آن خواند. */}
            <Controller
              control={form.control}
              name="provinceId"
              render={({ field }) => (
                <Field label="استان" htmlFor="province" error={errors.provinceId?.message}>
                  <AnimatedSelect
                    id="province"
                    heading="استان"
                    placeholder="انتخاب کنید"
                    invalid={!!errors.provinceId}
                    value={field.value}
                    onBlur={field.onBlur}
                    options={PROVINCES.map((item) => ({ value: item.id, label: item.name }))}
                    onValueChange={(v) => {
                      field.onChange(v);
                      /* ⚠️ عوض شدنِ استان، شهر را پاک می‌کند.

                         بدونِ این، کسی که «تهران / شهریار» را انتخاب کرده
                         و بعد استان را به «فارس» عوض می‌کند، یک ردیفِ
                         «فارس / شهریار» می‌سازد — که هم شِما ردش می‌کند و
                         هم `users_city_under_province_check` در دیتابیس. */
                      form.setValue("cityId", null);
                    }}
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <Field
                  label="شهر"
                  htmlFor="city"
                  error={errors.cityId?.message}
                  hint={provinceId ? undefined : "اول استان را انتخاب کن."}
                >
                  <AnimatedSelect
                    id="city"
                    heading="شهر"
                    placeholder="انتخاب کنید"
                    disabled={!provinceId}
                    invalid={!!errors.cityId}
                    value={field.value}
                    onBlur={field.onBlur}
                    options={cities.map((item) => ({ value: item.id, label: item.name }))}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Field label="مدرسه" htmlFor="school" error={errors.school?.message}>
              <Input
                id="school"
                placeholder="مثلاً دبیرستان شهید بهشتی"
                aria-invalid={!!errors.school}
                {...form.register("school")}
              />
            </Field>

            {/* ⚠️ «پایهٔ تحصیلی» فقط برای دانش‌آموز معنا دارد.

                دبیر پایهٔ تحصیلی ندارد؛ پایه چیزی است که او *درس می‌دهد* و
                جایش در خودِ کلاس است (`teacher_classes.grade`)، چون یک دبیر
                می‌تواند همزمان دهم و یازدهم داشته باشد. پرسیدنش در پروفایل
                هم بی‌معنا بود و هم گمراه‌کننده: دبیری که «دهم» را می‌زد فکر
                می‌کرد کلاس‌هایش را دارد تعیین می‌کند.

                ⚠️ و پاک کردنِ مقدارِ قبلی لازم است و نه فقط پنهان کردنِ
                فیلد. `PATCH /profile` کلِ پروفایل را می‌نویسد (توضیحش بالای
                همین فایل)، پس یک پایهٔ جامانده در state بی‌صدا ذخیره
                می‌شد — و بعداً اگر کاربر به «دانش‌آموز» برمی‌گشت، پایه‌ای
                می‌دید که یادش نمی‌آمد انتخاب کرده باشد. */}
            {!hideGrade && (
              <Controller
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <Field label="پایهٔ تحصیلی" htmlFor="grade" error={errors.grade?.message}>
                    <AnimatedSelect
                      id="grade"
                      heading="پایهٔ تحصیلی"
                      placeholder="انتخاب کنید"
                      invalid={!!errors.grade}
                      value={field.value}
                      onBlur={field.onBlur}
                      options={GRADES.map((g) => ({ value: g, label: GRADE_LABEL[g] }))}
                      onValueChange={field.onChange}
                    />
                  </Field>
                )}
              />
            )}
          </div>

          <RoleChoice
            value={desiredRole}
            onChange={(v) => form.setValue("desiredRole", v, { shouldDirty: true })}
            currentRole={user.role}
          />

          {saved && save.isSuccess && (
            <p role="status" className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[13px] text-primary">
              پروفایلت ذخیره شد.
            </p>
          )}
          {save.isError && (
            <p role="status" className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {save.error.message}
            </p>
          )}

          <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
            {save.isPending ? "در حال ذخیره…" : "ذخیرهٔ پروفایل"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

/* ─────────────────────────── انتخابِ نقش (بند ۳) ────────────────────────── */

/**
 * ⚠️ متنِ زیرِ گزینهٔ «دبیر» مهم‌ترین بخشِ این کامپوننت است.
 *
 * بند ۳ صریح می‌گوید انتخابِ دبیر «به معنی تایید دبیر بودن نیست». اگر این
 * جمله در رابط کاربری نوشته نشود، هر کسی که این دکمه را می‌زند فکر می‌کند
 * همین حالا دبیر شده — و وقتی هیچ‌کدام از قابلیت‌ها را نمی‌بیند، آن را یک
 * باگ می‌فهمد و به پشتیبانی پیام می‌دهد.
 *
 * ⚠️ و برای کاربری که از قبل دبیرِ تأییدشده است، این انتخاب اصلاً نمایش
 * داده نمی‌شود: تغییرش هیچ اثری بر `role` ندارد (سرور فقط `desired_role` را
 * می‌نویسد) و نشان دادنِ یک کلیدِ بی‌اثر فقط این توهم را می‌سازد که می‌شود
 * با آن نقش را برگرداند.
 */
function RoleChoice({
  value,
  onChange,
  currentRole,
}: {
  value: "student" | "teacher";
  onChange: (v: "student" | "teacher") => void;
  currentRole: string;
}) {
  if (currentRole === "teacher") {
    return (
      <div className="rounded-xl border border-border/70 bg-foreground/[0.03] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap aria-hidden className="size-4" />
          حساب شما به‌عنوان دبیر تأیید شده است.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          کلاس‌هایت در «پنل دبیر» است.
        </p>
      </div>
    );
  }

  const options = [
    {
      key: "student" as const,
      title: "دانش‌آموز",
      body: "تمرین، کارنامه و پیوستن به کلاس دبیرت.",
    },
    {
      key: "teacher" as const,
      title: "دبیر",
      body: "بعد از انتخاب، می‌توانی مدارکت را برای فعال‌سازی حساب دبیر بفرستی.",
    },
  ];

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-medium text-muted-foreground">
        از سروا برای چه استفاده می‌کنی؟
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.key}
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors",
              value === option.key
                ? "border-primary bg-primary/[0.06]"
                : "border-border hover:border-muted-foreground/50",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="radio"
                name="desiredRole"
                className="size-4 accent-[var(--primary)]"
                checked={value === option.key}
                onChange={() => onChange(option.key)}
              />
              {option.title}
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">{option.body}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
