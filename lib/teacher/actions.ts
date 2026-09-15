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
  allowRejoin,
  createClass,
  joinClassByCode,
  leaveClass,
  previewClassByCode,
  removeClassMember,
  rotateJoinCode,
  setClassActive,
  setJoinEnabled,
  type ClassPreview,
} from "./classes";
import { NO_SUCH_CODE } from "./membership";
import { inviteQrSvg } from "./invite";
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

/**
 * کدِ تازه برای کلاس — وقتی کدِ قبلی جایی پخش شده.
 *
 * ⚠️ QRِ تازه در همین پاسخ برمی‌گردد و نه با یک رفت‌وبرگشتِ دیگر.
 *
 * بدونِ آن، دبیر پس از چرخاندنِ کد یک QRِ **سوخته** روی صفحه می‌دید تا
 * رفرشِ بعدی — و ممکن بود همان را به کلاس نشان دهد. کدِ روی صفحه از همان
 * اول به همین دلیل در پاسخ برمی‌گشت؛ QR هم همان‌جاست.
 */
export async function teacherRotateJoinCode(
  classId: string,
): Promise<ActionResult<{ joinCode: string; qrSvg: string }>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");

  const code = await rotateJoinCode(teacher.id, id);
  if (!code) return invalid(["کلاس پیدا نشد."]);

  revalidatePath("/panel/teacher");
  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: { joinCode: code, qrSvg: inviteQrSvg(code) } };
}

/**
 * باز و بسته کردنِ **عضوگیری**.
 *
 * ⚠️ این همان دکمه‌ای است که تا مهاجرت ۰۱۴ به `is_active` وصل بود. متنِ
 * رابط کاربری از همان اول همین را می‌گفت («کسی نمی‌تواند عضو شود، اعضای
 * فعلی سرِ جایشان هستند») ولی ستونش چیزِ دیگری بود. حالا هر دو یک چیز
 * می‌گویند و `is_active` برای بایگانی آزاد شد.
 */
export async function teacherSetJoinEnabled(
  classId: string,
  enabled: boolean,
): Promise<ActionResult<null>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");
  const value = boolArg(enabled, "مقدار نامعتبر است.");

  const done = await setJoinEnabled(teacher.id, id, value);
  if (!done) return invalid(["کلاس پیدا نشد."]);

  revalidatePath("/panel/teacher");
  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: null };
}

/**
 * «اجازهٔ بازگشت» به دانش‌آموزی که دبیر بیرونش گذاشته بود.
 *
 * ⚠️ خودش عضو نمی‌کند: وضعیت از `blocked` به `removed` می‌رود و دانش‌آموز
 * باید خودش دوباره با کد وارد شود. عضو کردنِ کسی بدونِ اینکه خواسته باشد،
 * دقیقاً همان کاری است که جریانِ «پیش‌نمایش سپس تأیید» برای جلوگیری از آن
 * ساخته شد.
 */
export async function teacherAllowRejoin(
  classId: string,
  studentId: string,
): Promise<ActionResult<null>> {
  const teacher = await requireTeacher();
  const id = uuidArg(classId, "شناسهٔ کلاس نامعتبر است.");
  const student = uuidArg(studentId, "شناسهٔ دانش‌آموز نامعتبر است.");

  const done = await allowRejoin(teacher.id, id, student);
  if (!done) return invalid(["این دانش‌آموز در فهرستِ اخراج‌شده‌های این کلاس نیست."]);

  revalidatePath(`/panel/teacher/class/${id}`);
  return { ok: true, data: null };
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
 * گامِ **اول** از پیوستن: نگاه کردن، بدونِ عضو شدن.
 *
 * ⚠️ چرا این گام اصلاً وجود دارد:
 *
 * تا امروز وارد کردنِ کد **مستقیماً** عضویت می‌ساخت. یعنی دانش‌آموز پیش از
 * آنکه بداند کلاسِ کیست، در کدام مدرسه است، و مهم‌تر از همه **دبیر از این
 * به بعد چه چیزی از او می‌بیند**، قبولش کرده بود. برای دسترسی به دادهٔ
 * آموزشیِ یک نوجوان، «کد را زدی پس قبول کردی» رضایت نیست.
 *
 * ⚠️ این اکشن هیچ چیزی نمی‌نویسد. (`previewClassByCode` هم همین‌طور — و
 * تستِ E2E می‌سنجد که تعدادِ ردیف‌های `class_members` عوض نشود.)
 */
export async function studentPreviewClass(
  joinCode: string,
): Promise<ActionResult<ClassPreview>> {
  const user = await requireUser();

  const text = optionalTextArg(joinCode, 20, "کد عضویت خیلی بلند است.");
  if (!text) return invalid(["کد عضویت را وارد کنید."]);

  const code = normalizeJoinCode(text);

  /* ⚠️ شکلِ بدشکل همان پیامِ «پیدا نشد» را می‌گیرد و نه «فرمت غلط است».
     تفکیکشان به کسی که کد می‌سازد می‌گفت کدام الگوها اصلاً وجود دارند. */
  if (!/^[A-Z2-9]{6,10}$/.test(code)) return invalid([NO_SUCH_CODE]);

  /* ⚠️ سقفِ نرخ روی **پیش‌نمایش** هم لازم است و نه فقط روی عضویت.

     بدونِ آن، پیش‌نمایش به یک اوراکلِ رایگان تبدیل می‌شد: با هر کد می‌شد
     پرسید «کلاسی هست؟» و نامِ دبیر و مدرسه را گرفت، بی‌آنکه هیچ ردیفی
     ساخته شود و هیچ سقفی به آن بخورد. سخاوتمندتر از عضویت است (دانش‌آموز
     ممکن است کد را غلط تایپ کند) ولی کران‌دار.

     دیتابیسی و نه در-حافظه: این یک شمارشِ امنیتی است و ری‌استارتِ سرور
     نباید سهمیه را برگرداند. */
  const limit = await rateLimitDb(`class-preview:${user.id}`, 30, 60 * 60);
  if (!limit.allowed) {
    return invalid([`تلاش‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`]);
  }

  const result = await previewClassByCode(user.id, code);
  if (!result.ok) return invalid([result.error]);

  return { ok: true, data: result.preview };
}

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
