"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher, requireUser } from "@/lib/auth/current-user";
import { uuidArg, boolArg, optionalTextArg, enumArg } from "@/lib/api/action-input";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { GRADES, classNameField, schoolField } from "@/lib/profile/schemas";
import { isValidLocation } from "@/lib/geo";
import { notify } from "@/lib/plus/notifications";
import { normalizeJoinCode } from "./join-code";
import { findOrCreateSchool, findSchool, linkTeacherToSchool } from "./schools";
import {
  createClass,
  joinClassByCode,
  leaveClass,
  removeClassMember,
  rotateJoinCode,
  setClassActive,
} from "./classes";
import type { School, TeacherClass } from "./types";

/**
 * Server Action های پنلِ دبیر و دانش‌آموز.
 *
 * =============================================================================
 * ⚠️ هر تابعِ این فایل با یک گارد شروع می‌شود، و این قابلِ مذاکره نیست
 * =============================================================================
 *
 * یک Server Action در عمل یک endpointِ شبکه است: Next یک شناسه برایش
 * می‌سازد و هر کسی می‌تواند مستقیم به آن POST بزند، بدونِ اینکه از هیچ فرمی
 * رد شود. یعنی «این دکمه فقط در پنلِ دبیر رندر می‌شود» هیچ دفاعی نیست.
 *
 * (همان استدلالِ کاملِ `lib/api/action-input.ts`، که `uuidArg` و
 * `enumArg` هم از آنجا می‌آیند: تایپ‌های TypeScript در زمانِ اجرا پاک
 * می‌شوند و هیچ‌چیزی را تضمین نمی‌کنند.)
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function invalid(errors: string[]): ActionResult<never> {
  return { ok: false, errors };
}

/* ═══════════════════════════════ مدرسه ═══════════════════════════════ */

/**
 * ثبتِ مدرسه — گامِ ۲ در فرآیندِ خواسته‌شده («ابتدا مدرسه خود را ایجاد یا
 * انتخاب می‌کند»).
 *
 * ⚠️ سقفِ نرخ در دیتابیس و نه در حافظه: بدونِ آن، یک دبیر می‌توانست جدولِ
 * مدرسه‌ها را با ردیف‌های بی‌معنا پر کند و چون این ردیف‌ها برای *همهٔ*
 * دبیرانِ آن شهر نمایش داده می‌شوند، `<select>` هر کدامشان خراب می‌شد.
 */
export async function teacherCreateSchool(input: {
  name: string;
  provinceId: string;
  cityId: string;
}): Promise<ActionResult<School>> {
  const teacher = await requireTeacher();

  const name = schoolField.safeParse(input.name);
  if (!name.success) return invalid(name.error.issues.map((i) => i.message));

  if (!isValidLocation(input.provinceId, input.cityId) || !input.cityId) {
    return invalid(["استان و شهر را درست انتخاب کنید."]);
  }

  const limit = await rateLimitDb(`school-create:${teacher.id}`, 10, 24 * 60 * 60);
  if (!limit.allowed) {
    return invalid(["تعداد مدرسه‌های ثبت‌شده از حد مجاز گذشت. فردا دوباره تلاش کنید."]);
  }

  const school = await findOrCreateSchool({
    name: name.data,
    provinceId: input.provinceId,
    cityId: input.cityId,
    createdBy: teacher.id,
  });

  revalidatePath("/panel/teacher");
  return { ok: true, data: school };
}

/* ═══════════════════════════════ کلاس ════════════════════════════════ */

export async function teacherCreateClass(input: {
  schoolId: string;
  name: string;
  grade: string;
}): Promise<ActionResult<TeacherClass>> {
  const teacher = await requireTeacher();

  const schoolId = uuidArg(input.schoolId, "مدرسه را انتخاب کنید.");
  const grade = enumArg(input.grade, GRADES, "پایهٔ تحصیلی نامعتبر است.");

  const name = classNameField.safeParse(input.name);
  if (!name.success) return invalid(name.error.issues.map((i) => i.message));

  // ⚠️ وجودِ مدرسه صریحاً بررسی می‌شود و به کلیدِ خارجی واگذار نمی‌شود.
  // FK یک خطای ۵۰۰ی بی‌توضیح می‌داد؛ اینجا پیامش فارسی است.
  const school = await findSchool(schoolId);
  if (!school) return invalid(["مدرسهٔ انتخاب‌شده پیدا نشد."]);

  const limit = await rateLimitDb(`class-create:${teacher.id}`, 30, 24 * 60 * 60);
  if (!limit.allowed) {
    return invalid(["تعداد کلاس‌های ساخته‌شده از حد مجاز گذشت. فردا دوباره تلاش کنید."]);
  }

  const created = await createClass({
    teacherId: teacher.id,
    schoolId,
    name: name.data,
    grade,
  });

  // ⚠️ دبیری که کلاسی زیرِ مدرسه‌ای می‌سازد، عضوِ آن مدرسه است — حتی اگر
  // مدرسه را خودش ثبت نکرده باشد. بدونِ این خط، فقط سازندهٔ مدرسه عضو
  // می‌ماند و «چند دبیر در یک مدرسه» (بند ۱۳) نصفه می‌شد.
  await linkTeacherToSchool(teacher.id, schoolId);

  revalidatePath("/panel/teacher");
  return { ok: true, data: created };
}

/** باز یا بستنِ کلاس. */
export async function teacherSetClassActive(
  classId: string,
  isActive: boolean,
): Promise<ActionResult<null>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");
  const active = boolArg(isActive, "مقدار نامعتبر است.");

  // ⚠️ گاردِ مالکیت داخلِ خودِ UPDATE است (`lib/teacher/classes.ts`)، پس
  // «پیدا نشد» و «مالِ تو نیست» هر دو به `false` می‌رسند — و همان یک پیام
  // می‌گیرند. تفکیکشان فقط به کسی که شناسه‌ها را امتحان می‌کند اطلاعات
  // می‌داد.
  const done = await setClassActive(teacher.id, id, active);
  if (!done) return invalid(["کلاس پیدا نشد."]);

  revalidatePath("/panel/teacher");
  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: null };
}

/** کدِ تازه برای کلاس — وقتی کدِ قبلی جایی پخش شده. */
export async function teacherRotateJoinCode(classId: string): Promise<ActionResult<{ joinCode: string }>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");

  const code = await rotateJoinCode(teacher.id, id);
  if (!code) return invalid(["کلاس پیدا نشد."]);

  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: { joinCode: code } };
}

/** بیرون گذاشتنِ یک دانش‌آموز از کلاس. */
export async function teacherRemoveMember(
  classId: string,
  studentId: string,
): Promise<ActionResult<null>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");
  const student = uuidArg(studentId, "شناسهٔ دانش‌آموز نامعتبر است.");

  const done = await removeClassMember(teacher.id, id, student);
  if (!done) return invalid(["این دانش‌آموز در کلاس شما نیست."]);

  /* ⚠️ دانش‌آموز باید بداند دیگر عضو نیست.

     بدونِ این، تنها راهِ فهمیدنش سر زدن به صفحهٔ کلاس‌هاست — و تا آن موقع
     فکر می‌کند دبیرش هنوز عملکردش را می‌بیند. خودِ دسترسی همان لحظه قطع
     شده (`teacherCanSeeStudent` روی `status = 'active'` است)؛ این فقط
     همان را می‌گوید.

     ⚠️ بعد از موفقیتِ عملیات و بیرون از آن — شکستِ اعلان نباید خروج را
     برگرداند. `notify` خودش هرگز throw نمی‌کند. */
  await notify({
    userId: student,
    kind: "class_removed",
    title: "عضویت شما در یک کلاس پایان یافت",
    body: "از این پس دبیر آن کلاس عملکرد آموزشی شما را نمی‌بیند.",
    href: "/panel/classes",
  });

  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: null };
}

/* ═════════════════════════ سمتِ دانش‌آموز ════════════════════════════ */

/**
 * پیوستن به کلاس با کد — گامِ ۵ در فرآیندِ خواسته‌شده.
 *
 * ⚠️ `requireUser` و نه `requireTeacher`: این یکی کارِ دانش‌آموز است.
 *
 * ⚠️ سقفِ نرخ اینجا از همه مهم‌تر است، چون این تنها جایی است که یک نفر
 * می‌تواند کدها را *حدس* بزند. فضای کد حدود یک میلیارد است، ولی بدونِ سقف،
 * یک اسکریپت در چند ساعت بخشِ قابلِ توجهی از آن را می‌گردد. با ۲۰ تلاش در
 * ساعت، گشتنش قرن‌ها طول می‌کشد.
 */
export async function studentJoinClass(
  joinCode: string,
): Promise<ActionResult<{ className: string; rejoined: boolean }>> {
  const user = await requireUser();

  const text = optionalTextArg(joinCode, 20, "کد عضویت خیلی بلند است.");
  if (!text) return invalid(["کد عضویت را وارد کنید."]);

  const code = normalizeJoinCode(text);
  if (!/^[A-Z2-9]{6,10}$/.test(code)) return invalid(["کد عضویت معتبر نیست."]);

  const limit = await rateLimitDb(`class-join:${user.id}`, 20, 60 * 60);
  if (!limit.allowed) {
    return invalid([`تلاش‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`]);
  }

  const result = await joinClassByCode(user.id, code);
  if (!result.ok) return invalid([result.error]);

  /* ⚠️ اعلانِ عضویت، و مهم‌تر از خودِ عضویت: **آنچه با آن عوض می‌شود**.

     از این لحظه یک آدمِ دیگر می‌تواند عملکردِ آموزشیِ این نوجوان را ببیند.
     گفتنش در همان لحظه — نه در یک صفحهٔ «قوانین» که کسی نمی‌خواند — تنها
     شکلی است که واقعاً اطلاع‌رسانی حساب می‌شود.

     ⚠️ و دقیقاً همان‌قدر که درست است: «عملکرد آموزشی»، نه «فعالیت شما».
     دبیر خرید، تیکت، نشست و کلاس‌های دیگر را نمی‌بیند. */
  await notify({
    userId: user.id,
    kind: "class_joined",
    title: `به کلاس «${result.className}» پیوستید`,
    body: "دبیر این کلاس می‌تواند عملکرد آموزشی مرتبط با فعالیت‌های شما در سروا را ببیند.",
    href: "/panel/classes",
    /* یک بار به‌ازای هر کلاس: پیوستنِ دوباره پس از خروج، همان پیام را
       تکرار نمی‌کند. */
    dedupeKey: `class-joined:${result.classId}`,
  });

  revalidatePath("/panel/classes");
  return { ok: true, data: { className: result.className, rejoined: result.rejoined } };
}

/** خروجِ خودخواسته از کلاس. */
export async function studentLeaveClass(classId: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");

  const done = await leaveClass(user.id, id);
  if (!done) return invalid(["شما عضو این کلاس نیستید."]);

  revalidatePath("/panel/classes");
  return { ok: true, data: null };
}
