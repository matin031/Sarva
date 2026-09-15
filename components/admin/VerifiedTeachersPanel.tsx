"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";
import RevokeTeacherDialog from "@/components/admin/RevokeTeacherDialog";
import { adminRevokeTeacher } from "@/lib/admin/teacher-actions";
import {
  adminGetTeacherClasses,
  adminListTeachers,
  type AdminTeacherClassRow,
  type AdminTeacherRow,
} from "@/lib/admin/teacher-directory";
import { GRADE_LABEL } from "@/lib/profile/schemas";

/**
 * دبیرانِ فعال — نمای عملیاتیِ پشتیبانی.
 *
 * =============================================================================
 * ⚠️ این تبِ دوم چه چیزی را حل می‌کند
 * =============================================================================
 *
 * تا امروز پنلِ ادمین فقط *درخواست‌ها* را می‌دید. یعنی به این سؤال‌ها —
 * که همه‌شان سؤالِ یک تیکتِ واقعی‌اند — هیچ جوابی نداشت جز SQL Console:
 *
 *   • «کلاسم عضو نمی‌گیرد» ← عضوگیری‌اش باز است یا نه؟
 *   • «پلاسم فعال نشد» ← اشتراکِ دبیری‌اش هست یا نه؟
 *   • «این حساب واقعاً دبیر است؟» ← نقشش الان چیست؟
 *
 * و SQL Console برای این کار ابزارِ غلطی است: دسترسیِ خام به کلِ دیتابیس
 * برای خواندنِ سه عدد، با این خطر که مدیر برای سرعت `select *` بزند و کد
 * ملی و کلیدِ سندِ نیم‌دوجین کاربرِ دیگر هم جلویش باز شود.
 *
 * ⚠️ چیزی که اینجا **نیست**: پاسخ و عملکردِ دانش‌آموزان، بازخوردهای خصوصی،
 * کدِ عضویتِ خام، QR، صورتحساب. مرزش در `lib/admin/teacher-directory.ts`
 * نوشته شده و همان‌جا هم اجرا می‌شود — این کامپوننت چیزی را پنهان
 * نمی‌کند که سرور فرستاده باشد؛ سرور اصلاً نمی‌فرستد.
 */

const PAGE_SIZE = 25;

export default function VerifiedTeachersPanel() {
  const toast = useAdminToast();
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AdminTeacherRow | null>(null);
  /* ⚠️ حالتِ اولیه «هنوز نخوانده‌ایم» است و نه «چیزی نیست». بدونِ این
     تمایز، نیم‌ثانیهٔ اولِ باز شدنِ تب دقیقاً شبیهِ «هیچ دبیری وجود
     ندارد» دیده می‌شود. */
  const [loaded, setLoaded] = useState(false);
  const [busy, startTransition] = useTransition();

  const load = (nextSearch: string, append = false) => {
    startTransition(async () => {
      const result = await adminListTeachers({
        search: nextSearch || undefined,
        limit: PAGE_SIZE,
        offset: append ? teachers.length : 0,
      });
      setTeachers((prev) => (append ? [...prev, ...result.teachers] : result.teachers));
      setTotal(result.total);
      setLoaded(true);
    });
  };

  /* ⚠️ فهرست در *کلاینت* و هنگامِ باز شدنِ تب خوانده می‌شود و نه در
     `page.tsx`. مدیری که برای رسیدگی به صف آمده — یعنی بیشترِ دفعات —
     نباید هزینهٔ کوئریِ این تب را بدهد. */
  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revoke = (teacher: AdminTeacherRow, reason: string) => {
    startTransition(async () => {
      const result = await adminRevokeTeacher(teacher.id, reason);
      if (!result.ok) return toast(result.errors.join("\n"));
      toast("دسترسی دبیری لغو شد.", "success");
      setRevoking(null);
      /* ⚠️ ردیف دستی حذف نمی‌شود و فهرست از نو خوانده می‌شود: لغو هم نقش
         را عوض می‌کند، هم اشتراک را، هم `join_enabled` کلاس‌ها را. سه
         مقدارِ محاسبه‌شده که دستی به‌روز کردنشان سه جای تازه برای اشتباه
         است. */
      load(search, false);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          dir="rtl"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          /* ⚠️ placeholder برچسب نیست: با تایپِ اولین حرف ناپدید می‌شود و
             صفحه‌خوان هم آن را اسمِ فیلد حساب نمی‌کند. */
          aria-label="جست‌وجو در دبیران فعال"
          placeholder="جست‌وجو با نام یا ایمیل…"
          className="min-h-11 w-full max-w-xs flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loaded ? `${total.toLocaleString("fa-IR")} دبیر` : "در حال خواندن…"}
        </p>
      </div>

      {loaded && teachers.length === 0 && !busy && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {search ? "دبیری با این مشخصات پیدا نشد." : "هنوز دبیر تأییدشده‌ای وجود ندارد."}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {teachers.map((teacher) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            open={openId === teacher.id}
            busy={busy}
            onToggle={() => setOpenId((id) => (id === teacher.id ? null : teacher.id))}
            onRevoke={() => setRevoking(teacher)}
          />
        ))}
      </div>

      {teachers.length < total && (
        <button
          type="button"
          disabled={busy}
          onClick={() => load(search, true)}
          className="min-h-11 rounded-xl border border-border text-sm font-medium outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
        >
          {busy ? "در حال بارگذاری…" : "نمایش بیشتر"}
        </button>
      )}

      {revoking && (
        <RevokeTeacherDialog
          who={revoking.fullName || revoking.email || "این کاربر"}
          busy={busy}
          onCancel={() => setRevoking(null)}
          onConfirm={(reason) => revoke(revoking, reason)}
        />
      )}
    </div>
  );
}

/* ───────────────────────────── کارتِ یک دبیر ───────────────────────────── */

function TeacherCard({
  teacher,
  open,
  busy,
  onToggle,
  onRevoke,
}: {
  teacher: AdminTeacherRow;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-w-0 flex-1 rounded-lg text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{teacher.fullName || "بدون نام"}</span>
            {/* ⚠️ «پلاس دبیری ندارد» فقط وقتی دیده می‌شود که واقعاً نداشته
                باشد. یک نشانِ سبزِ «دارد» روی هر ردیف همان اطلاعات را
                می‌دهد، ولی حالتِ غیرعادی را در میانِ بیست ردیفِ عادی گم
                می‌کند. */}
            {!teacher.hasTeacherPlus && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                پلاس دبیری ندارد
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground" dir="ltr">
            {teacher.email ?? "—"}
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className="text-[13px] text-muted-foreground">
            {teacher.classCount.toLocaleString("fa-IR")} کلاس ·{" "}
            {teacher.studentCount.toLocaleString("fa-IR")} دانش‌آموز
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={onRevoke}
            className="min-h-9 rounded-xl border border-border px-3 text-[13px] font-medium text-muted-foreground outline-none hover:border-destructive/50 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
          >
            لغو دبیری
          </button>
        </div>
      </div>

      {open && (
        <>
          <dl className="grid gap-x-6 gap-y-3 border-t border-border p-4 text-sm sm:grid-cols-2">
            <Field label="شناسهٔ پشتیبانی" value={teacher.id} ltr />
            <Field label="ایمیل" value={teacher.email ?? "—"} ltr />
            <Field
              label="تاریخ آخرین تأیید"
              /* ⚠️ «ثبت نشده» و نه یک تاریخِ ساختگی: نقشِ دبیر بدونِ پروندهٔ
                 تأییدشده یعنی نقش از راهِ دیگری آمده (مثلاً دستی در
                 دیتابیس) — و این خودش چیزی است که مدیر باید ببیند. */
              value={
                teacher.approvedAt
                  ? new Date(teacher.approvedAt).toLocaleString("fa-IR")
                  : "ثبت نشده"
              }
            />
            <Field label="نقش فعلی" value="دبیر" />
            <Field label="سروا پلاس دبیری" value={teacher.hasTeacherPlus ? "فعال" : "فعال نیست"} />
            <Field
              label="مدرسه‌ها"
              value={teacher.schools.length > 0 ? teacher.schools.join("، ") : "ثبت نشده"}
            />
          </dl>
          {/* ⚠️ کلاس‌ها فقط با باز شدنِ همین کارت خوانده می‌شوند — وگرنه یک
              صفحهٔ بیست‌وپنج‌ردیفی بیست‌وپنج کوئریِ اضافه می‌زد برای چیزی که
              دیده نمی‌شود. همان قاعدهٔ `RequestHistory`. */}
          <TeacherClasses key={teacher.id} teacherId={teacher.id} />
        </>
      )}
    </div>
  );
}

/* ─────────────────── کلاس‌های دبیر — فقط برای پشتیبانی ──────────────────── */

/**
 * ⚠️ این بخش **فقط خواندنی** است و هیچ دکمه‌ای ندارد.
 *
 * مدیر کلاسِ کسی را نمی‌بندد، بایگانی نمی‌کند و کدش را نمی‌چرخاند. آن‌ها
 * کارهای خودِ دبیرند و یک دکمهٔ مدیریتی رویشان یعنی یک مسیرِ تازه برای
 * تغییرِ کلاسِ یک نفرِ دیگر، بدونِ اینکه او بفهمد. تنها نوشتنی که مدیر روی
 * کلاس‌ها دارد، پیامدِ خودکارِ «لغو دبیری» است که خودش ثبت و اعلام می‌شود.
 */
function TeacherClasses({ teacherId }: { teacherId: string }) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error" } | { kind: "ready"; classes: AdminTeacherClassRow[] }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    adminGetTeacherClasses(teacherId)
      .then((result) => {
        if (!alive) return;
        setState(result ? { kind: "ready", classes: result.classes } : { kind: "error" });
      })
      .catch(() => {
        /* ⚠️ حالتِ خطا لازم است: بدونِ آن یک قطعیِ شبکه دقیقاً شبیهِ «این
           دبیر کلاسی ندارد» دیده می‌شود — و آن دو، دو جوابِ کاملاً متفاوت
           به تیکتِ «کلاسم گم شده» هستند. */
        if (alive) setState({ kind: "error" });
      });

    return () => {
      alive = false;
    };
  }, [teacherId]);

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      <h3 className="text-xs font-bold text-muted-foreground">کلاس‌ها</h3>

      {state.kind === "loading" && (
        <p className="text-[13px] text-muted-foreground">در حال خواندن…</p>
      )}
      {state.kind === "error" && (
        <p className="text-[13px] text-muted-foreground">فهرست کلاس‌ها خوانده نشد.</p>
      )}
      {state.kind === "ready" && state.classes.length === 0 && (
        <p className="text-[13px] text-muted-foreground">کلاسی نساخته است.</p>
      )}

      {state.kind === "ready" && state.classes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {state.classes.map((cls) => (
            <li
              key={cls.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border p-3 text-[13px]"
            >
              <span className="font-medium">{cls.name}</span>
              <span className="text-muted-foreground">
                · {GRADE_LABEL[cls.grade]} · {cls.schoolName}
              </span>
              <span className="text-muted-foreground">
                · {cls.memberCount.toLocaleString("fa-IR")} عضو فعال
              </span>
              {!cls.isActive && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  بایگانی‌شده
                </span>
              )}
              {/* ⚠️ «عضوگیری بسته» جدا از «بایگانی‌شده» نشان داده می‌شود، چون
                  دو چیزِ متفاوت‌اند و تیکتِ «کلاسم عضو نمی‌گیرد» دقیقاً با
                  همین تفاوت جواب داده می‌شود: کلاسِ زنده‌ای که درش بسته
                  است. */}
              {cls.isActive && !cls.joinEnabled && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold-ink">
                  عضوگیری بسته
                </span>
              )}
              <span className="ms-auto text-xs text-muted-foreground">
                {new Date(cls.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className={ltr ? "text-start font-mono text-xs" : ""}>
        {value}
      </dd>
    </div>
  );
}
