"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, UserRound, ShieldCheck } from "lucide-react";
import styles from "./panel/panel-design.module.css";
import z from "zod";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { apiPatch, apiPost } from "@/lib/api/client";
import { passwordField } from "@/lib/auth/schemas";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";

/**
 * تنظیمات حساب — «تغییر نام» و «تغییر رمز».
 *
 * سه چیز نسبت به نسخهٔ قبل عوض شده و هر سه به‌خاطرِ راست‌به‌چپ یا خوانایی
 * است، نه سلیقه:
 *
 *   ۱. ⚠️ فرمِ رمز دیگر `dir="ltr"` **ندارد**. آن یک ویژگی روی کلِ فرم بود
 *      تا ستاره‌های رمز از چپ پر شوند، ولی لیبل‌های فارسی («رمز عبور فعلی»)
 *      را هم با خودش می‌برد و کلِ کارت چپ‌چین می‌شد. حالا فقط خودِ
 *      `<input>` جهتِ چپ دارد.
 *
 *   ۲. سه ورودیِ رمز، سه بلوکِ کپی‌شدهٔ ۶۰ خطی بودند با SVGِ چشمِ تکراری در
 *      هرکدام. حالا یک `PasswordInput` است که سه بار استفاده می‌شود.
 *
 *   ۳. پیامِ نتیجه دیگر با `message.includes("موفقیت")` رنگ نمی‌گیرد —
 *      حدس‌زدنِ موفقیت از روی *متنِ* پیام، با اولین تغییرِ متن می‌شکند.
 *      حالا وضعیتِ mutation خودش می‌گوید موفق بوده یا نه.
 */

const nameSchema = z.object({
  name: z
    .string()
    .min(3, "نام باید دستِ‌کم ۳ حرف باشد")
    .max(12, "نام حداکثر ۱۲ حرف است")
    .regex(/^[؀-ۿ\s]+$/, "نام را به فارسی بنویس"),
});

const passwordSchema = z
  .object({
    // رمزِ فعلی فقط باید خالی نباشد — همان کاری که سرور می‌کند. اعمالِ
    // قوانینِ تازه روی آن، کاربری را که رمزش را پیش از تغییرِ قوانین ساخته
    // از تغییر دادنش محروم می‌کرد.
    prevPassword: z.string().min(1, "رمز فعلی را وارد کن"),
    // رمزِ تازه از همان شِمای سرور می‌آید تا این دو هرگز از هم نیفتند.
    newPassword: passwordField,
    confirmNewPassword: z.string().min(1, "تکرار رمز را وارد کن"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "تکرار رمز با رمز تازه یکی نیست",
    path: ["confirmNewPassword"],
  });

type NameForm = z.infer<typeof nameSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

/** پیامِ نتیجه زیرِ فرم — موفق یا ناموفق، بدونِ حدس زدن از روی متن. */
function FormStatus({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-xl border px-3 py-2 text-[13px] leading-relaxed",
        ok
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-destructive/35 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </p>
  );
}

function PasswordInput({
  id,
  autoComplete,
  ...props
}: React.ComponentProps<"input"> & { id: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        // فقط خودِ ورودی چپ‌چین است — لیبل و خطا فارسی و راست‌چین می‌مانند.
        dir="ltr"
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        className="pe-11 text-left placeholder:text-center"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff aria-hidden className="size-4.5" /> : <Eye aria-hidden className="size-4.5" />}
      </button>
    </div>
  );
}

export default function AccountSettings({ initialName = "" }: { initialName?: string }) {
  const { user } = useCurrentUser();
  const [savedName, setSavedName] = useState<{ userId: string | undefined; name: string } | null>(null);
  const currentName = savedName && savedName.userId === user?.id
    ? savedName.name : user?.fullName ?? initialName;

  const nameForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const changeName = useMutation({
    mutationFn: async (data: NameForm) => {
      const result = await apiPatch("/api/v1/auth/profile", { name: data.name });
      // ⚠️ خطای برگشتی از API یک پاسخِ موفق با `ok:false` است، نه یک throw.
      // اینجا به throw تبدیل می‌شود تا `isError` در React Query معنی داشته
      // باشد؛ وگرنه هر پاسخی «موفق» شمرده می‌شد.
      if (!result.ok) throw new Error(result.errors.join(" "));
      return data.name;
    },
    onSuccess: (name) => {
      setSavedName({ userId: user?.id, name });
      // نامِ کاربر در سایدبار نشان داده می‌شود؛ بدونِ این تا رفرشِ بعدی
      // نامِ قدیمی می‌ماند.
      refreshCurrentUser();
      nameForm.reset();
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: PasswordForm) => {
      // یک درخواست، نه سه تا: سرور رمزِ فعلی را می‌سنجد، رمزِ تازه را ذخیره
      // می‌کند، سشن‌های دیگر را می‌بندد و برای همین دستگاه سشنِ تازه می‌دهد.
      const result = await apiPost("/api/v1/auth/change-password", {
        currentPassword: data.prevPassword,
        newPassword: data.newPassword,
      });
      if (!result.ok) throw new Error(result.errors.join(" "));
    },
    onSuccess: () => passwordForm.reset(),
  });

  return (
    <div className={styles.formGrid}>
      {/* ── نام ───────────────────────────────────────────────────────── */}
      <Card data-tone="lilac">
        <form onSubmit={nameForm.handleSubmit((d) => changeName.mutate(d))} noValidate>
          <div className={styles.formIntro}>
            <span className={styles.sticker}><UserRound aria-hidden className="size-5" /></span>
            <div><h2>با چه نامی صدایت کنیم؟</h2><p>همین نام در پنل و کارنامه‌ها نوشته می‌شود.</p></div>
          </div>

          <CardContent className="flex flex-col gap-4">
            <Field label="نام فعلی" htmlFor="current-name">
              <Input id="current-name" value={currentName} disabled readOnly />
            </Field>

            <Field
              label="نام تازه"
              htmlFor="new-name"
              error={nameForm.formState.errors.name?.message}
              hint="سه تا دوازده حرف فارسی."
            >
              <Input
                id="new-name"
                autoComplete="name"
                placeholder="مثلاً مهدی"
                aria-invalid={!!nameForm.formState.errors.name}
                {...nameForm.register("name")}
              />
            </Field>

            {changeName.isSuccess && <FormStatus ok>نامت عوض شد.</FormStatus>}
            {changeName.isError && <FormStatus ok={false}>{changeName.error.message}</FormStatus>}

            <Button type="submit" disabled={changeName.isPending} className="mt-1 w-full sm:w-auto">
              {changeName.isPending ? "در حال ذخیره…" : "ذخیرهٔ نام"}
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* ── رمز ───────────────────────────────────────────────────────── */}
      <Card data-tone="mint">
        <form onSubmit={passwordForm.handleSubmit((d) => changePassword.mutate(d))} noValidate>
          <div className={styles.formIntro}>
            <span className={styles.sticker}><ShieldCheck aria-hidden className="size-5" /></span>
            <div><h2>خیالت از حسابت راحت باشد</h2><p>با عوض کردن رمز، دستگاه‌های دیگر خارج می‌شوند؛ این دستگاه وارد می‌ماند.</p></div>
          </div>

          <CardContent className="flex flex-col gap-4">
            <Field
              label="رمز فعلی"
              htmlFor="prev-password"
              error={passwordForm.formState.errors.prevPassword?.message}
            >
              <PasswordInput
                id="prev-password"
                autoComplete="current-password"
                aria-invalid={!!passwordForm.formState.errors.prevPassword}
                {...passwordForm.register("prevPassword")}
              />
            </Field>

            <Field
              label="رمز تازه"
              htmlFor="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              hint="دستِ‌کم ۸ نویسه، با دستِ‌کم ۴ نویسهٔ متفاوت."
            >
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                aria-invalid={!!passwordForm.formState.errors.newPassword}
                {...passwordForm.register("newPassword")}
              />
            </Field>

            <Field
              label="تکرار رمز تازه"
              htmlFor="confirm-password"
              error={passwordForm.formState.errors.confirmNewPassword?.message}
            >
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                aria-invalid={!!passwordForm.formState.errors.confirmNewPassword}
                {...passwordForm.register("confirmNewPassword")}
              />
            </Field>

            {changePassword.isSuccess && <FormStatus ok>رمزت عوض شد.</FormStatus>}
            {changePassword.isError && (
              <FormStatus ok={false}>{changePassword.error.message}</FormStatus>
            )}

            <Button
              type="submit"
              disabled={changePassword.isPending}
              className="mt-1 w-full sm:w-auto"
            >
              {changePassword.isPending ? "در حال ذخیره…" : "ذخیرهٔ رمز تازه"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
