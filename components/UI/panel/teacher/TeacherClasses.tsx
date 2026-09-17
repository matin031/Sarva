"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ClipboardCopy, Plus, School as SchoolIcon, Users } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { AnimatedSelect } from "@/components/UI/kit/animated-select";
import { GRADES, GRADE_LABEL } from "@/lib/profile/schemas";
import { fa } from "@/lib/panel/format";
import { teacherCreateClass, teacherCreateSchool } from "@/lib/teacher/actions";
import type { School, TeacherClass } from "@/lib/teacher/types";
import styles from "../panel-design.module.css";

/**
 * مدرسه‌ها و کلاس‌های دبیر.
 *
 * ترتیبِ روی صفحه همان ترتیبِ خواسته‌شده است و عمدی:
 *
 *   ۲) اول مدرسه — ساختن یا انتخاب
 *   ۳) بعد کلاس، زیرِ همان مدرسه
 *   ۴) و کدِ عضویت که سیستم تولید می‌کند
 *
 * ⚠️ فرمِ کلاس تا وقتی هیچ مدرسه‌ای نباشد غیرفعال است. اگر فعال بود، دبیر
 * فرم را پر می‌کرد و در لحظهٔ ارسال پیامِ «مدرسه را انتخاب کنید» می‌گرفت —
 * برای کاری که از اول شدنی نبود.
 */

export default function TeacherClasses({
  initialClasses,
  initialSchools,
  provinceId,
  cityId,
}: {
  initialClasses: TeacherClass[];
  initialSchools: School[];
  provinceId: string | null;
  cityId: string | null;
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [schools, setSchools] = useState(initialSchools);

  /* ⚠️ بدونِ استان و شهر در پروفایل، نه مدرسه ساخته می‌شود و نه کلاس.
     جدولِ `schools` هر دو را NOT NULL دارد (و یک CHECK که شهر باید زیرِ
     همان استان باشد)، پس این یک محدودیتِ واقعی است و نه یک ترجیحِ رابط
     کاربری — و بهترین کاری که اینجا می‌شود کرد، فرستادنِ دبیر به همان
     فرمی است که درستش می‌کند. */
  if (!provinceId || !cityId) {
    return (
      <Card data-tone="gold">
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-bold">اول استان و شهرت را کامل کن</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            کلاس به مدرسه وصل می‌شود و مدرسه به شهر؛ بدون آن‌ها نمی‌شود کلاس ساخت.
          </p>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/panel/setting">رفتن به تکمیل پروفایل</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SchoolCard
        provinceId={provinceId}
        cityId={cityId}
        schools={schools}
        onCreated={(school) =>
          // ⚠️ اگر مدرسه از قبل وجود داشته باشد، سرور همان ردیفِ موجود را
          // برمی‌گرداند («بساز یا برگردان» در `lib/teacher/schools.ts`).
          // پس اینجا باید بررسی شود، وگرنه فهرست دو ردیفِ یکسان می‌گیرد.
          setSchools((prev) => (prev.some((s) => s.id === school.id) ? prev : [...prev, school]))
        }
      />

      <ClassCard
        schools={schools}
        onCreated={(created) => setClasses((prev) => [created, ...prev])}
      />

      <ClassList classes={classes} />
    </div>
  );
}

/* ──────────────────────────────── مدرسه ───────────────────────────────── */

function SchoolCard({
  provinceId,
  cityId,
  schools,
  onCreated,
}: {
  provinceId: string;
  cityId: string;
  schools: School[];
  onCreated: (school: School) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await teacherCreateSchool({ name, provinceId, cityId });
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      onCreated(result.data);
      setName("");
    });
  };

  return (
    <Card data-tone="lilac">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <SchoolIcon aria-hidden className="size-5" />
        </span>
        <div>
          <h2>مدرسه‌ها</h2>
          <p>مدرسه‌ات را اضافه کن؛ اگر همکارت قبلاً ثبتش کرده، همان انتخاب می‌شود.</p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4">
        {schools.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {schools.map((school) => (
              <li
                key={school.id}
                className="rounded-full border border-border bg-foreground/[0.03] px-3 py-1 text-[13px]"
              >
                {school.name}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="نام مدرسه" htmlFor="school-name" className="flex-1">
            <Input
              id="school-name"
              value={name}
              placeholder="مثلاً دبیرستان شهید بهشتی"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={pending || name.trim().length < 2}
            onClick={submit}
          >
            <Plus aria-hidden />
            {pending ? "در حال ثبت…" : "افزودن مدرسه"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── ساختِ کلاس ─────────────────────────────── */

function ClassCard({
  schools,
  onCreated,
}: {
  schools: School[];
  onCreated: (created: TeacherClass) => void;
}) {
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<string>("11");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const noSchools = schools.length === 0;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await teacherCreateClass({ schoolId, name, grade });
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      onCreated(result.data);
      setName("");
    });
  };

  return (
    <Card data-tone="mint">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <Users aria-hidden className="size-5" />
        </span>
        <div>
          <h2>کلاس تازه</h2>
          <p>بعد از ساختن، یک کد عضویت می‌گیری که به دانش‌آموزانت می‌دهی.</p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4">
        {noSchools && (
          <p className="rounded-xl border border-gold/40 bg-gold/[0.08] px-3 py-2 text-[13px]">
            اول یک مدرسه اضافه کن.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="مدرسه" htmlFor="class-school">
            <AnimatedSelect
              id="class-school"
              heading="مدرسه"
              placeholder="انتخاب کنید"
              value={schoolId}
              disabled={noSchools}
              options={schools.map((school) => ({ value: school.id, label: school.name }))}
              onValueChange={setSchoolId}
            />
          </Field>

          <Field label="نام کلاس" htmlFor="class-name">
            <Input
              id="class-name"
              value={name}
              placeholder="مثلاً یازدهم ۱"
              disabled={noSchools}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="پایه" htmlFor="class-grade">
            <AnimatedSelect
              id="class-grade"
              heading="پایه"
              value={grade}
              disabled={noSchools}
              options={GRADES.map((g) => ({ value: g, label: GRADE_LABEL[g] }))}
              onValueChange={setGrade}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="whitespace-pre-line text-[13px] text-destructive">
            {error}
          </p>
        )}

        <Button
          type="button"
          disabled={pending || noSchools || !schoolId || name.trim().length < 2}
          onClick={submit}
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden />
          {pending ? "در حال ساخت…" : "ساخت کلاس"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────── فهرستِ کلاس‌ها ───────────────────────────── */

function ClassList({ classes }: { classes: TeacherClass[] }) {
  if (classes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="font-medium">اولین کلاست را بساز</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          مدرسه را انتخاب کن، نام و پایهٔ کلاس را بنویس، و کد عضویتی که سروا می‌سازد را به
          دانش‌آموزانت بده.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {classes.map((klass) => (
        <Card key={klass.id} className={klass.isActive ? undefined : "opacity-70"}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{klass.name}</h3>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {klass.schoolName} · پایهٔ {GRADE_LABEL[klass.grade]}
                </p>
              </div>
              {!klass.isActive && (
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  بایگانی
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <JoinCode code={klass.joinCode} />
              <span className="text-muted-foreground">
                {fa(klass.memberCount)} دانش‌آموز
              </span>
              {/* ⚠️ «عضوگیری بسته» با «بایگانی» یکی نیست — دو ستونِ جدا از
                  مهاجرت ۰۱۴. نشانِ مشترک یعنی دبیر نداند کدام را باید باز
                  کند. */}
              {!klass.joinEnabled && klass.isActive && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  عضوگیری بسته
                </span>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={`/panel/teacher/class/${klass.id}`}>مدیریت کلاس</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * کدِ عضویت با دکمهٔ کپی.
 *
 * ⚠️ `navigator.clipboard` در بافتِ ناامن (http روی یک IP محلی) وجود ندارد و
 * صدا زدنش استثنا می‌دهد. بدونِ `catch`، کلیک روی دکمه در آن حالت یک خطای
 * مدیریت‌نشده در کنسول می‌گذاشت و هیچ بازخوردی به کاربر نمی‌داد — کد هم
 * روی صفحه هست، پس بدترین حالت این است که دستی انتخابش کند.
 */
function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(code)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1 font-mono text-sm tracking-widest transition-colors hover:border-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`کپی کد عضویت ${code}`}
    >
      <span dir="ltr">{code}</span>
      <ClipboardCopy aria-hidden className="size-3.5 text-muted-foreground" />
      {copied && <span className="font-sans text-[11px] text-primary">کپی شد</span>}
    </button>
  );
}
