import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, type Tx } from "@/lib/db";
import type { TeacherVerificationLogEntry } from "./types";

/**
 * تاریخچهٔ بررسیِ پرونده‌های دبیری — تنها نویسنده و خوانندهٔ
 * `teacher_verification_logs`.
 *
 * ⚠️ چرا این جدول کنارِ `admin_audit_log` وجود دارد و جایگزینش نیست:
 *
 * آن یکی لاگِ عملیاتیِ مدیریت است (از حذف واژه تا اجرای SQL) و فقط ادمین
 * می‌بیندش. این یکی تاریخچهٔ *یک پرونده* است و به خودِ دبیر هم نشان داده
 * می‌شود.
 *
 * دو چیز یکی کردنشان را غلط می‌کند:
 *
 *   • اینجا ردیف‌هایی هست که ادمین ننوشته (`submitted`، `resubmitted`).
 *   • نشان دادنِ `admin_audit_log` به یک کاربرِ عادی یعنی باز کردنِ جدولی
 *     که خلاصهٔ کارهای مدیریتیِ کلِ سایت در آن است.
 *
 * تصمیم‌های ادمین در **هر دو** ثبت می‌شوند؛ این تکرارِ عمدی است.
 */

export type VerificationAction = TeacherVerificationLogEntry["action"];

export type RecordVerificationParams = {
  requestId: string;
  teacherId: string;
  /** null یعنی خودِ کاربر اقدام کرده (`submitted` / `resubmitted`). */
  adminId: string | null;
  action: VerificationAction;
  description?: string | null;
};

/**
 * یک ردیفِ تاریخچه می‌نویسد.
 *
 * ⚠️ `tx` اختیاری است و این امضا عمدی است.
 *
 * تصمیم‌های ادمین (تأیید/رد/اصلاح) باید **داخلِ همان تراکنشی** ثبت شوند که
 * وضعیتِ پرونده را عوض می‌کند. اگر بیرون بود، یک قطعیِ بینِ آن دو یعنی
 * پرونده‌ای که تأیید شده ولی هیچ ردیفی نمی‌گوید چه کسی و کِی تأییدش کرد —
 * و این دقیقاً همان سؤالی است که شش ماه بعد پرسیده می‌شود.
 *
 * برای `submitted`/`resubmitted` که تراکنشی در کار نیست، بدونِ `tx` صدا
 * زده می‌شود.
 *
 * ⚠️ بر خلافِ `notify`، این تابع خطا را **قورت نمی‌دهد**. یک اعلانِ
 * ازدست‌رفته آزاردهنده است؛ یک تاریخچهٔ ازدست‌رفته یعنی سابقهٔ تصمیمِ
 * مدیریتی روی یک سندِ هویتی گم شده.
 */
export async function recordVerification(
  tx: Tx | null,
  params: RecordVerificationParams,
): Promise<void> {
  const run = tx ? tx.execute.bind(tx) : execute;

  await run(
    `insert into teacher_verification_logs
       (id, request_id, teacher_id, admin_id, action, description)
     values (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      params.requestId,
      params.teacherId,
      params.adminId,
      params.action,
      // سقفِ ستون ۵۰۰ است؛ بریدن بهتر از شکستنِ کلِ تراکنش در حالت strict.
      params.description?.slice(0, 500) ?? null,
    ],
  );
}

type LogRow = {
  id: string;
  action: VerificationAction;
  description: string | null;
  actor_name: string | null;
  created_at: string;
};

function toEntry(row: LogRow): TeacherVerificationLogEntry {
  return {
    id: row.id,
    action: row.action,
    description: row.description,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}

/**
 * تاریخچهٔ یک پرونده — برای پنل ادمین.
 *
 * ⚠️ گاردِ دسترسی اینجا نیست و نباید باشد: این تابع فقط از
 * `lib/admin/teacher-actions.ts` صدا زده می‌شود که خودش `requireAdmin()`
 * دارد. پخش کردنِ گارد در دو لایه یعنی روزی یکی‌شان از قلم بیفتد.
 */
export async function listRequestHistory(
  requestId: string,
): Promise<TeacherVerificationLogEntry[]> {
  const rows = await query<LogRow>(
    `select l.id, l.action, l.description, l.created_at,
            a.full_name as actor_name
       from teacher_verification_logs l
       left join users a on a.id = l.admin_id
      where l.request_id = ?
      order by l.created_at, l.id
      limit 100`,
    [requestId],
  );
  return rows.map(toEntry);
}

/**
 * تاریخچهٔ درخواست‌های **خودِ** یک کاربر.
 *
 * ⚠️ `teacher_id` در `where` است و نه در یک `if` جداگانه — همان قاعده‌ای که
 * کلِ `lib/teacher/classes.ts` رعایت می‌کند. بدونِ RLS، شرطِ مالکیت باید در
 * خودِ کوئری باشد.
 *
 * ⚠️ و نامِ ادمین اینجا **خوانده نمی‌شود**. کاربر لازم نیست بداند کدام ادمین
 * پرونده‌اش را رد کرده؛ آن اسم فقط یک نفر را هدفِ گلایه می‌کند.
 */
export async function listMyVerificationHistory(
  userId: string,
): Promise<TeacherVerificationLogEntry[]> {
  const rows = await query<LogRow>(
    `select id, action, description, created_at, null as actor_name
       from teacher_verification_logs
      where teacher_id = ?
      order by created_at desc, id
      limit 50`,
    [userId],
  );
  return rows.map(toEntry);
}
