import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "@/lib/db";
import { logger } from "@/lib/observability";
import { notify } from "@/lib/plus/notifications";
/* ⚠️ قاعدهٔ پنجره در یک ماژولِ خالصِ جدا زندگی می‌کند تا قابلِ تست باشد —
   این فایل `"server-only"` است. */
import { hourBucket, shouldNotify } from "./view-window";

/**
 * «دبیر عملکردِ این دانش‌آموز را دید».
 *
 * =============================================================================
 * ⚠️ ثبت و اعلان عمداً دو چیزِ جدا هستند
 * =============================================================================
 *
 * **هر** بازدید ثبت می‌شود — دقیق، چون کلِ دلیلِ وجودِ این جدول شفافیت
 * است: دانش‌آموزی که دادهٔ آموزشی‌اش دیده می‌شود باید بتواند بداند چه کسی
 * و کِی دیده.
 *
 * **اعلان** ولی در هر پنجره فقط یک بار ساخته می‌شود. اگر یک‌به‌یک بود،
 * دبیری که صفحه را چند بار تازه می‌کند — کاری که هر کسی موقعِ کار با یک
 * جدول می‌کند — برای دانش‌آموزش ده اعلان می‌ساخت. و دانش‌آموزی که ده
 * اعلانِ تکراری بگیرد، اعلان‌ها را خاموش می‌کند و اعلانِ *واقعیِ* بعدی را
 * هم نمی‌بیند.
 */

export type ViewRecord = {
  teacherId: string;
  teacherName: string | null;
  studentId: string;
  classId: string;
  className: string;
};

/**
 * یک بازدید را ثبت می‌کند و در صورت لزوم اعلان می‌سازد.
 *
 * ⚠️ هرگز throw نمی‌کند. این یک کارِ جانبی است؛ اگر شکستش بتواند صفحهٔ
 * عملکرد را بشکند، یک جدولِ فرعی به مسیرِ اصلی وصل شده که نباید.
 * (همان قاعدهٔ `notify()` و `recordActivity()`.)
 *
 * ⚠️ فراخوان باید **قبلاً** دسترسی را سنجیده باشد (`getStudentForTeacher`).
 * این تابع گاردِ دسترسی نیست و نباید به‌عنوانِ گارد استفاده شود.
 */
export async function recordStudentView(view: ViewRecord): Promise<void> {
  try {
    /* ⚠️ ترتیب: اول «آخرین بازدیدِ قبلی» خوانده می‌شود و بعد ردیفِ تازه
       نوشته می‌شود. برعکسش یعنی ردیفِ خودمان را می‌خواندیم و پنجره همیشه
       صفر بود — هیچ اعلانی هرگز ساخته نمی‌شد. */
    const previous = await queryOne<{ viewed_at: string }>(
      `select viewed_at
         from teacher_student_views
        where teacher_id = ? and student_id = ? and class_id = ?
        order by viewed_at desc
        limit 1`,
      [view.teacherId, view.studentId, view.classId],
    );

    const now = new Date();

    await execute(
      `insert into teacher_student_views (id, teacher_id, student_id, class_id, viewed_at)
       values (?, ?, ?, ?, ?)`,
      /* ⚠️ زمان از Node و نه `now(6)` — همان قراردادِ
         `user_activity_events.occurred_at`. چرایی‌اش در
         `docs/time-contract.md`. */
      [randomUUID(), view.teacherId, view.studentId, view.classId, now],
    );

    if (!shouldNotify(previous?.viewed_at ?? null, now)) return;

    const teacher = view.teacherName?.trim() || "دبیر شما";

    await notify({
      userId: view.studentId,
      kind: "teacher_viewed_student",
      /* ⚠️ لحن. «دبیر شما فعالیت‌های شما را رصد کرد» همان واقعیت است و
         ترسناک؛ این جمله همان واقعیت است و آموزشی. برای نوجوانی که
         نمی‌داند دبیرش دقیقاً چه می‌بیند، تفاوتش کوچک نیست. */
      title: `${teacher} روند یادگیری شما را بررسی کرد`,
      body: `کلاس ${view.className}`,
      href: "/panel/classes",
      /* ⚠️ کلیدِ یکتاسازی فقط **مسابقه** را می‌گیرد و نه پنجره را.

         پنجرهٔ واقعی بالا با `shouldNotify` سنجیده می‌شود (دقیق و
         غلتان). ولی دو درخواستِ هم‌زمان می‌توانند هر دو «قبلی‌ای نیست»
         ببینند و هر دو اعلان بسازند. سطلِ ساعتی در این کلید یعنی دومی
         به ایندکسِ یکتا می‌خورد و بی‌صدا رد می‌شود.

         بدترین حالتِ باقی‌مانده: یک اعلانِ اضافه درست سرِ مرزِ ساعت. */
      dedupeKey: `tview:${view.teacherId}:${view.classId}:${hourBucket(now)}`,
    });
  } catch (err) {
    logger.error("ثبتِ بازدیدِ دبیر ناموفق بود", {
      event: "teacher.view.failed",
      err,
      user_id: view.studentId,
    });
  }
}

/* ═════════════════ نمای خودِ دانش‌آموز ═════════════════════════════════ */

export type StudentViewEntry = {
  teacherName: string | null;
  className: string;
  viewedAt: string;
};

/**
 * «چه کسانی عملکردِ من را دیده‌اند» — برای خودِ دانش‌آموز.
 *
 * ⚠️ شرطِ `student_id = ?` امنیتی است و نه فیلترِ راحتی: بدونِ آن هر کسی
 * می‌توانست ببیند دبیرها سراغِ چه کسانِ دیگری رفته‌اند — یعنی همان چیزی که
 * این جدول قرار بود ازش محافظت کند، خودش به نشتی تبدیل می‌شد.
 *
 * ⚠️ فقط تازه‌ترین بازدیدِ هر دبیر در هر کلاس، نه همهٔ ردیف‌ها: فهرستی که
 * بیست بار «آقای احمدی» داشته باشد چیزی به کسی نمی‌گوید.
 */
export async function listMyViewers(
  studentId: string,
  limit = 20,
): Promise<StudentViewEntry[]> {
  const rows = await query<{
    teacher_name: string | null;
    class_name: string;
    viewed_at: string;
  }>(
    `select u.full_name as teacher_name, c.name as class_name, max(v.viewed_at) as viewed_at
       from teacher_student_views v
       join users u on u.id = v.teacher_id
       join teacher_classes c on c.id = v.class_id
      where v.student_id = ?
      group by v.teacher_id, v.class_id, u.full_name, c.name
      order by viewed_at desc
      limit ?`,
    [studentId, Math.min(Math.max(limit, 1), 50)],
  );

  return rows.map((r) => ({
    teacherName: r.teacher_name,
    className: r.class_name,
    viewedAt: r.viewed_at,
  }));
}
