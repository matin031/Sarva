"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Clock, FileUp, FileWarning, ShieldAlert } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { AnimatedSelect } from "@/components/UI/kit/animated-select";
import type { ApiResult } from "@/lib/api/client";
import { PROVINCES, citiesOf } from "@/lib/geo";
import { teacherRequestSchema, type TeacherRequestInput } from "@/lib/profile/schemas";
import { jalaliLong } from "@/lib/panel/format";
import {
  TEACHER_STATUS_LABEL,
  type TeacherAccountState,
  type TeacherRequestReadiness,
  type TeacherRequestView,
} from "@/lib/teacher/types";
import styles from "../panel-design.module.css";

/**
 * «فعال‌سازی حساب دبیر» — بندهای ۴، ۵ و ۶.
 *
 * ⚠️ چهار حالتِ کاملاً جدا، و جدا بودنشان کلِ نکتهٔ بند ۶ است:
 *
 *   • تأییدشده     → کارِ تمام. فرم اصلاً نمایش داده نمی‌شود.
 *   • در انتظار    → فقط وضعیت. فرمِ دوم یعنی کاربر فکر کند باید دوباره
 *                    بفرستد، و سرور هم قبولش نمی‌کند (یک درخواستِ باز در
 *                    هر لحظه).
 *   • رد شده       → **دلیلِ رد**، و بعد فرمِ تازه. بدونِ دلیل، کاربر همان
 *                    مدارک را دوباره می‌فرستد و دوباره رد می‌شود.
 *   • بدونِ درخواست → فقط فرم.
 *
 * ⚠️ و «هر زمان خواست می‌تواند درخواست ثبت کند» (بند ۴): این کارت هیچ
 * اجباری نمی‌سازد و هیچ‌جای دیگری از پنل را قفل نمی‌کند.
 */

async function submit(form: FormData): Promise<ApiResult<{ request: TeacherRequestView }>> {
  try {
    /* ⚠️ `apiPost` به کار نمی‌آید: بدنه `FormData` است و آن تابع
       `JSON.stringify` می‌کند. ضمناً `content-type` نباید دستی نوشته شود —
       مرورگر باید خودش `boundary` را بگذارد. */
    const response = await fetch("/api/v1/teacher/request", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as ApiResult<{
      request: TeacherRequestView;
    }> | null;
    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      return { ok: false, errors: ["پاسخ نامعتبر از سرور دریافت شد."] };
    }
    return payload;
  } catch {
    return { ok: false, errors: ["ارتباط با سرور برقرار نشد."] };
  }
}

export default function TeacherActivation({
  initialState,
  readiness,
}: {
  initialState: TeacherAccountState;
  readiness: TeacherRequestReadiness;
}) {
  const [state, setState] = useState(initialState);

  if (state.state === "teacher") {
    return (
      <Card data-tone="mint">
        <CardContent className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BadgeCheck aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">حساب دبیری‌ات فعال است</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              می‌توانی مدرسه و کلاس بسازی و عملکرد دانش‌آموزانت را ببینی. سروا پلاس هم برایت دائمی فعال است.
            </p>
            {state.request?.reviewedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                تأیید شده در {jalaliLong(state.request.reviewedAt)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.state === "pending") {
    return <PendingCard request={state.request} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {state.state === "rejected" && <ReviewNoteCard request={state.request} tone="rejected" />}
      {state.state === "needs_revision" && (
        <ReviewNoteCard request={state.request} tone="needs_revision" />
      )}
      <RequestForm
        readiness={readiness}
        /* ⚠️ فرم با مقادیرِ پروندهٔ باز پر می‌شود.
           کسی که فقط باید یک عکسِ واضح‌تر بفرستد، نباید کد ملی و استان و
           شهر و مدرسه را از نو تایپ کند — هر فیلدِ اضافه یک فرصتِ تازه
           برای انصراف است. */
        initial={state.state === "needs_revision" ? state.request : null}
        onSubmitted={(request) => setState({ state: "pending", request })}
      />
    </div>
  );
}

/* ───────────────────────────── وضعیت‌ها ─────────────────────────────── */

function StatusRow({ request }: { request: TeacherRequestView }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <Detail label="وضعیت" value={TEACHER_STATUS_LABEL[request.status]} />
      <Detail label="تاریخ درخواست" value={jalaliLong(request.createdAt)} />
      <Detail label="محل تدریس" value={request.locationLabel ?? "—"} />
      <Detail label="مدرسه" value={request.school} />
      {/* ⚠️ کد ملی پوشیده است، حتی در صفحهٔ خودِ کاربر. توضیحش کنارِ
          `maskNationalId` در `lib/profile/national-id.ts`. */}
      <Detail label="کد ملی" value={request.nationalIdMasked ?? "—"} />
      <Detail label="شمارهٔ تأییدشده" value={request.phoneMasked ?? "—"} ltr />
    </dl>
  );
}

/**
 * ⚠️ `ltr` برای شمارهٔ موبایل لازم است و نه فقط زیباتر.
 *
 * `maskPhone` «0912 *** 6789» می‌دهد. داخلِ یک پنلِ راست‌به‌چپ،
 * الگوریتمِ دوسویهٔ یونیکد «***» را خنثی می‌بیند، جهتِ پاراگراف را
 * به آن می‌دهد، و دو گروهِ رقم جایِ هم را عوض می‌کنند: «6789 *** 0912».
 *
 * دبیر این‌جا دارد بررسی می‌کند که مدارکش با کدام شماره ثبت شده؛
 * شمارهٔ وارونه یعنی پیام به پشتیبانی.
 */
function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function PendingCard({ request }: { request: TeacherRequestView }) {
  return (
    <Card data-tone="gold">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <Clock aria-hidden className="size-5" />
        </span>
        <div>
          <h2>درخواستت در انتظار بررسی است</h2>
          <p>نتیجه را در اعلان‌ها می‌بینی.</p>
        </div>
      </div>
      <CardContent>
        <StatusRow request={request} />
      </CardContent>
    </Card>
  );
}

/**
 * کارتِ «یادداشتِ بررسی» — هم برای رد و هم برای نیاز به اصلاح.
 *
 * ⚠️ یک کامپوننت با دو لحن، و نه دو کامپوننت: ساختارشان یکی است (یادداشت
 * برجسته، بعد جزئیات) و تنها تفاوتشان متن و رنگ است. دو نسخهٔ جدا یعنی
 * روزی یکی‌شان تغییر کند و آن یکی نه.
 *
 * ⚠️ ولی لحنشان واقعاً فرق دارد و این مهم است: «رد شد» یک پایان است و
 * «نیاز به اصلاح» یک ادامه. نوشتنِ «رد شد» روی پرونده‌ای که فقط یک عکسِ
 * واضح‌تر می‌خواهد، کاربری را که برمی‌گشت، برای همیشه می‌برد.
 */
function ReviewNoteCard({
  request,
  tone,
}: {
  request: TeacherRequestView;
  tone: "rejected" | "needs_revision";
}) {
  const rejected = tone === "rejected";

  return (
    <Card className={rejected ? "border-destructive/40" : "border-gold/45"}>
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          {rejected ? (
            <ShieldAlert aria-hidden className="size-5" />
          ) : (
            <FileWarning aria-hidden className="size-5" />
          )}
        </span>
        <div>
          <h2>{rejected ? "درخواست قبلی‌ات تأیید نشد" : "مدارکت نیاز به اصلاح دارد"}</h2>
          <p>
            {rejected
              ? "می‌توانی با مدارک درست دوباره درخواست بدهی."
              : "پرونده‌ات باز است؛ فقط همین مورد را درست کن و دوباره بفرست."}
          </p>
        </div>
      </div>
      <CardContent className="flex flex-col gap-4">
        {/* ⚠️ یادداشت بالاتر از جزئیات است و برجسته‌تر: تنها چیزی است که
            کاربر برای درست کردنِ ارسالِ بعدی لازم دارد. */}
        {request.reviewNote && (
          <div
            className={
              rejected
                ? "rounded-xl border border-destructive/35 bg-destructive/[0.07] p-4"
                : "rounded-xl border border-gold/40 bg-gold/8 p-4"
            }
          >
            <p
              className={
                rejected ? "text-xs font-medium text-destructive" : "text-xs font-medium"
              }
            >
              {rejected ? "دلیل رد" : "چه چیزی را اصلاح کن"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{request.reviewNote}</p>
          </div>
        )}
        <StatusRow request={request} />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── فرمِ درخواست ──────────────────────────── */

function RequestForm({
  readiness,
  initial,
  onSubmitted,
}: {
  readiness: TeacherRequestReadiness;
  /** پروندهٔ بازِ «نیاز به اصلاح»، برای پر کردنِ اولیهٔ فرم. */
  initial: TeacherRequestView | null;
  onSubmitted: (request: TeacherRequestView) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TeacherRequestInput>({
    resolver: zodResolver(teacherRequestSchema),
    defaultValues: {
      /* ⚠️ کد ملی عمداً خالی می‌ماند حتی در حالتِ اصلاح.
         آنچه سرور برمی‌گرداند پوشیده است (`00••••••78`) و ریختنش در فرم
         یعنی کاربر همان نقطه‌ها را دوباره می‌فرستد و اعتبارسنجی ردش
         می‌کند — با پیامی که هیچ ربطی به کارِ او ندارد. */
      nationalId: "",
      provinceId: initial?.provinceId ?? "",
      cityId: initial?.cityId ?? "",
      school: initial?.school ?? "",
    },
  });

  /* ⚠️ `useWatch` و نه `form.watch()`.
     آن یکی در هر رندر یک تابعِ تازه برمی‌گرداند و کامپایلرِ React
     نمی‌تواند این کامپوننت را memo کند (هشدارِ
     `react-hooks/incompatible-library`). `useWatch` یک اشتراکِ واقعی
     است: فقط همین فیلد را دنبال می‌کند و با تغییرش رندر می‌شود. */
  const provinceId = useWatch({ control: form.control, name: "provinceId" });
  const cities = useMemo(() => citiesOf(provinceId), [provinceId]);

  const blocked = !readiness.profileCompleted || !readiness.phoneVerified;

  const onValid = async (data: TeacherRequestInput) => {
    if (!file) {
      setError("فایل حکم کارگزینی یا مدرک اثبات دبیر بودن را پیوست کن.");
      return;
    }

    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("nationalId", data.nationalId);
    body.append("provinceId", data.provinceId);
    body.append("cityId", data.cityId);
    body.append("school", data.school);
    body.append("document", file);

    const result = await submit(body);
    setBusy(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }
    onSubmitted(result.data.request);
  };

  const errors = form.formState.errors;

  return (
    <Card data-tone="lilac">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <FileUp aria-hidden className="size-5" />
        </span>
        <div>
          <h2>فعال‌سازی حساب دبیر</h2>
          <p>مدارکت را بفرست. بعد از تأیید، پنل دبیر فعال می‌شود.</p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-5">
        {/* ⚠️ پیش‌شرط‌ها *بالای* فرم و نه به‌شکلِ خطا بعد از ارسال. کسی که
            شماره‌اش تأیید نشده نباید فرم را پر کند، فایل آپلود کند و بعد
            بفهمد از اول نمی‌شده. */}
        {blocked && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-gold/40 bg-gold/8 p-4 text-sm">
            <p className="font-semibold">قبل از ارسال درخواست:</p>
            <ul className="list-inside list-disc text-[13px] leading-relaxed text-muted-foreground">
              {!readiness.profileCompleted && <li>نام و نام خانوادگی‌ات را در «تکمیل پروفایل» ثبت کن.</li>}
              {!readiness.phoneVerified && <li>شمارهٔ موبایلت را تأیید کن.</li>}
            </ul>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onValid)} noValidate className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="کد ملی"
              htmlFor="national-id"
              error={errors.nationalId?.message}
              hint="ده رقم، بدون خط تیره."
            >
              <Input
                id="national-id"
                dir="ltr"
                inputMode="numeric"
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                disabled={blocked}
                aria-invalid={!!errors.nationalId}
                className="text-left placeholder:text-center"
                {...form.register("nationalId")}
              />
            </Field>

            <Field
              label="شمارهٔ موبایل تأییدشده"
              htmlFor="verified-phone"
              hint={
                readiness.phoneVerified
                  ? "همین شماره در درخواست ثبت می‌شود."
                  : "اول باید تأیید شود."
              }
            >
              {/* ⚠️ فقط-خواندنی و از سرور می‌آید.
                  اگر ورودی بود، هر کسی می‌توانست شمارهٔ شخصِ دیگری را ثبت
                  کند و مدیر هنگام بررسی به همان زنگ می‌زد. سرور هم اصلاً
                  شماره را از بدنهٔ درخواست نمی‌خواند. */}
              <Input
                id="verified-phone"
                dir="ltr"
                readOnly
                disabled
                value={readiness.phoneMasked ?? "—"}
                className="text-left"
              />
            </Field>

            <Controller
              control={form.control}
              name="provinceId"
              render={({ field }) => (
                <Field label="استان محل تدریس" htmlFor="teach-province" error={errors.provinceId?.message}>
                  <AnimatedSelect
                    id="teach-province"
                    heading="استان"
                    placeholder="انتخاب کنید"
                    disabled={blocked}
                    invalid={!!errors.provinceId}
                    value={field.value}
                    onBlur={field.onBlur}
                    options={PROVINCES.map((item) => ({ value: item.id, label: item.name }))}
                    onValueChange={(v) => {
                      field.onChange(v);
                      // همان قاعدهٔ فرمِ پروفایل: استانِ تازه، شهرِ قبلی را
                      // بی‌اعتبار می‌کند.
                      form.setValue("cityId", "");
                    }}
                  />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <Field label="شهر محل تدریس" htmlFor="teach-city" error={errors.cityId?.message}>
                  <AnimatedSelect
                    id="teach-city"
                    heading="شهر"
                    placeholder="انتخاب کنید"
                    disabled={blocked || !provinceId}
                    invalid={!!errors.cityId}
                    value={field.value}
                    onBlur={field.onBlur}
                    options={cities.map((item) => ({ value: item.id, label: item.name }))}
                    onValueChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Field
              label="مدرسه محل تدریس"
              htmlFor="teach-school"
              error={errors.school?.message}
              className="sm:col-span-2"
            >
              <Input
                id="teach-school"
                placeholder="مثلاً دبیرستان شهید بهشتی"
                disabled={blocked}
                aria-invalid={!!errors.school}
                {...form.register("school")}
              />
            </Field>
          </div>

          <Field
            label="حکم کارگزینی یا مدرک اثبات دبیر بودن"
            htmlFor="document"
            hint="PDF یا تصویر (jpg، png، webp) تا ۸ مگابایت. فقط مدیران سروا آن را می‌بینند."
          >
            {/* ⚠️ ورودیِ فایلِ بومی متنش را از زبانِ مرورگر می‌گیرد («Choose File /
                No file chosen») و نمی‌شود فارسی‌اش کرد. خودِ ورودی پنهان است و
                این قاب هم کلیک می‌گیرد و هم رها کردنِ فایل. */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!blocked) setFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className="relative flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-3.5 transition-colors hover:border-primary/60 has-[:disabled]:opacity-55 has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/25"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileUp aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{file ? file.name : "انتخاب فایل"}</span>
                <span className="block text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : "یا فایل را اینجا رها کن"}
                </span>
              </span>
              <input
                id="document"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={blocked}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
          </Field>

          {error && (
            <p role="alert" className="whitespace-pre-line rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy || blocked} className="w-full sm:w-auto">
            {busy ? "در حال ارسال…" : initial ? "ارسال دوبارهٔ مدارک" : "ارسال درخواست"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
