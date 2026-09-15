/**
 * آزمونِ end-to-endِ مسیرِ «دبیر شدن» روی یک دیتابیس واقعی —
 * `npm run db:check-teacher`.
 *
 * ⚠️ چرا اینجا و نه در `tests/`:
 *
 * چیزی که این فایل می‌سنجد رفتارِ *دیتابیس* است و نه منطقِ خالص: ایندکسِ
 * یکتای «یک پروندهٔ باز»، تریگری که آن ایندکس را تغذیه می‌کند، تراکنشِ
 * تأیید، و مسابقهٔ «تأیید در برابر ارسالِ دیرهنگام». هیچ‌کدام را نمی‌شود با
 * mock سنجید — mock دقیقاً همان چیزی را جعل می‌کند که قرار است اثبات شود.
 * و `npm test` باید روی ماشینِ بدونِ دیتابیس هم سبز بماند.
 *
 * همان الگوی `db:check-plus`، `db:check-rotation` و `db:check-otp`.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز با پیشوندِ `zz-teachercheck` ساخته و
 * در پایان پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, query, queryOne } from "@/lib/db";
import { submitTeacherRequest } from "@/lib/teacher/requests";
import { getLatestTeacherRequest, getTeacherAccountState } from "@/lib/teacher/requests";
import { listMyVerificationHistory } from "@/lib/teacher/verification-log";
import { findOrCreateSchool } from "@/lib/teacher/schools";
import {
  createClass,
  joinClassByCode,
  listStudentClasses,
  teacherCanSeeStudent,
} from "@/lib/teacher/classes";
// ⚠️ همان توابعی که Server Actionهای `lib/admin/teacher-directory.ts` صدا
// می‌زنند — آن فایل `requireAdmin()` دارد و بیرونِ Next اجرا نمی‌شود.
import { getTeacherSupportView, listTeacherDirectory } from "@/lib/teacher/directory";
// ⚠️ همان عددها و همان کلیدی که اکشن‌های ادمین به کار می‌برند.
import {
  TEACHER_REVIEW_LIMIT,
  TEACHER_REVOKE_LIMIT,
  adminWriteGate,
  adminWriteKey,
} from "@/lib/admin/teacher-limits";
import { getStudentForTeacher } from "@/lib/teacher/analytics";
import { createFeedback, listStudentFeedback } from "@/lib/teacher/feedback";
import { listRequestHistory } from "@/lib/teacher/verification-log";
// ⚠️ همان تابعی که Server Action ادمین صدا می‌زند — نه رونوشتِ آن.
import { approveTeacherRequest, revokeTeacher } from "@/lib/teacher/review";
import { getPlusStatusFor } from "@/lib/plus/entitlement";
import { notify } from "@/lib/plus/notifications";
import type { AuthUser } from "@/lib/auth/types";

let failures = 0;
let checks = 0;

function ok(label: string) {
  checks++;
  console.log(`  ✓ ${label}`);
}
function bad(label: string, detail?: string) {
  checks++;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
}
function is(actual: unknown, expected: unknown, label: string) {
  if (actual === expected) ok(label);
  else bad(label, `انتظار: ${JSON.stringify(expected)} — دریافت: ${JSON.stringify(actual)}`);
}
function truthy(value: unknown, label: string) {
  if (value) ok(label);
  else bad(label, `مقدار: ${JSON.stringify(value)}`);
}
function section(title: string) {
  console.log(`\n${title}`);
}

const TAG = "zz-teachercheck";

/* ─────────────────────────── کمک‌کننده‌ها ───────────────────────────── */

async function makeUser(suffix: string): Promise<AuthUser> {
  const id = randomUUID();
  // شمارهٔ یکتا و معتبر (`989…`), تا CHECK دیتابیس ردش نکند.
  const phone = `989${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`.slice(0, 12);

  await execute(
    `insert into users
       (id, email, phone, phone_verified_at, first_name, last_name,
        role, desired_role, profile_completed_at)
     values (?, ?, ?, now(6), 'آزمون', 'دبیری', 'student', 'teacher', now(6))`,
    [id, `${TAG}-${suffix}-${id.slice(0, 8)}@example.test`, phone],
  );

  return {
    id,
    email: `${TAG}@example.test`,
    phone,
    fullName: "آزمون دبیری",
    firstName: "آزمون",
    lastName: "دبیری",
    avatarUrl: null,
    provinceId: null,
    cityId: null,
    school: null,
    grade: null,
    role: "student",
    desiredRole: "teacher",
    emailVerified: false,
    phoneVerified: true,
    profileCompleted: true,
    isBanned: false,
    createdAt: new Date().toISOString(),
  };
}

async function makeAdmin(): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into users (id, email, role, first_name, last_name)
     values (?, ?, 'admin', 'مدیر', 'آزمون')`,
    [id, `${TAG}-admin-${id.slice(0, 8)}@example.test`],
  );
  return id;
}

const doc = (n: string) => ({
  key: `${TAG}-${n}.pdf`,
  name: `${n}.pdf`,
  contentType: "application/pdf",
  size: 1234,
});

/** یک استان/شهرِ واقعی از `lib/geo` — CHECK دیتابیس شکل را می‌سنجد. */
const PROVINCE = "IR008";
const CITY = "IR008001";

async function statusOf(requestId: string) {
  const row = await queryOne<{ status: string; pending_user_id: string | null }>(
    "select status, pending_user_id from teacher_requests where id = ?",
    [requestId],
  );
  return row;
}

/* ───────────────────────────── سناریوها ────────────────────────────── */

async function main() {
  /* ⚠️ سروا پلاس پیش‌فرض **خاموش** است (`DEFAULTS.enabled = false` در
     `lib/plus/config.ts`) و تا روشن نشود `getPlusStatusFor` برای همه
     `off` برمی‌گرداند — حتی برای دبیری که entitlement دارد. این رفتارِ
     درستی است (وقتی پلاس خاموش است کلِ سایت رایگان است) ولی یعنی آزمونِ
     resolver باید اول روشنش کند.

     ⚠️ و *پیش از هر فراخوانی*: `getPlusStatusFor` با `cache()` پوشیده شده
     و `getSetting` هم یک کشِ ۳۰ثانیه‌ای دارد. اگر بعد از اولین خواندن
     روشن شود، همان `off`ِ کش‌شده برمی‌گردد. */
  await execute(
    "insert into app_settings (`key`, value)" +
      "     values (?, json_quote(?))" +
      "     on duplicate key update value = values(value)",
    ["plus.enabled", "true"],
  );

  console.log("آزمونِ مسیرِ دبیر شدن — روی دیتابیسِ واقعی\n");

  /* ── ۱) ثبت درخواست ────────────────────────────────────────────── */
  section("۱) ثبت درخواست");
  const user = await makeUser("main");
  const submitted = await submitTeacherRequest({
    user,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان آزمون",
    document: doc("first"),
  });

  if (!submitted.ok) {
    bad("ثبت درخواست", submitted.error);
    return;
  }
  ok("درخواست ثبت شد");
  const requestId = submitted.request.id;
  is(submitted.request.status, "pending", "وضعیت اولیه pending است");

  const afterSubmit = await statusOf(requestId);
  is(afterSubmit?.pending_user_id, user.id, "تریگر pending_user_id را پر کرد (پرونده باز است)");

  const log1 = await listMyVerificationHistory(user.id);
  is(log1.length, 1, "یک ردیف تاریخچه ثبت شد");
  is(log1[0]?.action, "submitted", "رویداد اول submitted است");

  /* ── ۲) درخواستِ دوم نباید ممکن باشد ───────────────────────────── */
  section("۲) پروندهٔ دوم در حالت pending");
  const second = await submitTeacherRequest({
    user,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان دوم",
    document: doc("second"),
  });
  is(second.ok, false, "درخواست دوم رد شد");

  const count1 = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_requests where user_id = ?",
    [user.id],
  );
  is(count1?.n, 1, "فقط یک ردیف در دیتابیس هست");

  /* ── ۳) ادمین: نیاز به اصلاح ───────────────────────────────────── */
  section("۳) نیاز به اصلاح");
  // ⚠️ به‌جای صدا زدنِ Server Action (که `revalidatePath` دارد و بیرونِ
  // Next می‌شکند)، دقیقاً همان UPDATE ای زده می‌شود که آن اکشن می‌زند.
  // چیزی که اینجا سنجیده می‌شود رفتارِ *دیتابیس* است: تریگر، ایندکس یکتا.
  await execute(
    `update teacher_requests
        set status = 'needs_revision', rejection_reason = ?,
            reviewed_at = now(6)
      where id = ?`,
    ["تصویر حکم خوانا نیست.", requestId],
  );

  const afterRevision = await statusOf(requestId);
  is(afterRevision?.status, "needs_revision", "وضعیت needs_revision شد");
  is(
    afterRevision?.pending_user_id,
    user.id,
    "⚠️ پرونده همچنان «باز» است — تریگر needs_revision را باز می‌شمارد",
  );

  const view = await getLatestTeacherRequest(user.id);
  is(view?.reviewNote, "تصویر حکم خوانا نیست.", "یادداشت اصلاح به کاربر نشان داده می‌شود");

  /* ── ۴) ارسال دوباره ───────────────────────────────────────────── */
  section("۴) ارسال دوبارهٔ مدارک");
  const again = await submitTeacherRequest({
    user,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان اصلاح‌شده",
    document: doc("revised"),
  });
  is(again.ok, true, "ارسال دوباره پذیرفته شد");

  const count2 = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_requests where user_id = ?",
    [user.id],
  );
  is(count2?.n, 1, "⚠️ ردیفِ موازی ساخته نشد — همان پرونده به‌روز شد");

  const afterResubmit = await queryOne<{
    status: string;
    school: string;
    document_key: string;
    rejection_reason: string | null;
  }>("select status, school, document_key, rejection_reason from teacher_requests where id = ?", [
    requestId,
  ]);
  is(afterResubmit?.status, "pending", "دوباره pending شد");
  is(afterResubmit?.school, "دبیرستان اصلاح‌شده", "اطلاعات تازه ذخیره شد");
  is(afterResubmit?.document_key, `${TAG}-revised.pdf`, "مدرک تازه جایگزین شد");
  is(afterResubmit?.rejection_reason, null, "یادداشت قبلی پاک شد");

  const log2 = await listMyVerificationHistory(user.id);
  is(log2.length, 2, "تاریخچه دو ردیف دارد");
  is(log2[0]?.action, "resubmitted", "تازه‌ترین رویداد resubmitted است");

  /* ── ۵) تأیید ──────────────────────────────────────────────────── */
  section("۵) تأیید و فعال‌سازی پلاس");
  const adminId = await makeAdmin();
  const approved = await approveTeacherRequest(requestId, adminId);
  is(approved.kind, "approved", "تأیید انجام شد");
  if (approved.kind === "approved") {
    is(approved.grantCreated, true, "اشتراک تازه ساخته شد");
  }

  const roleRow = await queryOne<{ role: string }>("select role from users where id = ?", [user.id]);
  is(roleRow?.role, "teacher", "نقش کاربر teacher شد");

  const ent1 = await query<{ id: string; source: string; ends_at: string | null }>(
    "select id, source, ends_at from plus_entitlements where user_id = ?",
    [user.id],
  );
  is(ent1.length, 1, "دقیقاً یک entitlement ساخته شد");
  is(ent1[0]?.source, "teacher_verified", "نوعش teacher_verified است");
  is(ent1[0]?.ends_at, null, "مادام‌العمر است (ends_at = null)");

  const status = await getPlusStatusFor(user.id);
  is(status.isActive, true, "resolver پلاس را فعال می‌بیند");
  is(status.source, "teacher_verified", "resolver منبع را درست می‌خواند");
  is(status.isTrial, false, "«آزمایشی» نیست");

  /* ── ۶) تأییدِ دوباره ──────────────────────────────────────────── */
  section("۶) تأیید دوباره");
  const twice = await approveTeacherRequest(requestId, adminId);
  is(twice.kind, "settled", "⚠️ تأیید دوباره رد شد (پرونده بسته است)");
  const ent2 = await query<{ id: string }>(
    "select id from plus_entitlements where user_id = ?",
    [user.id],
  );
  is(ent2.length, 1, "⚠️ entitlement دوم ساخته نشد");

  /* ── ۷) مسابقه و گاردهای ارسالِ دیرهنگام ───────────────────────── */
  section("۷) مسابقه — ارسال دیرهنگام بعد از تأیید");

  /* گاردِ اول: نقش.
     ⚠️ این گاردِ واقعیِ تولید است و نه تئوری — `getCurrentUser()` ردیفِ
     کاربر را در *هر* درخواست از دیتابیس می‌خواند و نه از JWT، پس بعد از
     تأیید، `role` همان لحظه `teacher` است. */
  const lateByTeacher = await submitTeacherRequest({
    user: { ...user, role: "teacher" },
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "تلاش دیرهنگام",
    document: doc("late"),
  });
  is(lateByTeacher.ok, false, "کاربری که از قبل دبیر است، درخواست تازه نمی‌دهد");

  /* گاردِ دوم — مهم‌ترینِ این بخش: شرطِ `status = 'needs_revision'` داخلِ
     خودِ UPDATE.

     سناریو: کاربر فرمِ اصلاح را باز کرده، ادمین در همان فاصله تأیید
     می‌کند، و بعد کاربر «ارسال» می‌زند. اگر شرط در SQL نبود، آن UPDATE
     پروندهٔ **تأییدشده** را به `pending` برمی‌گرداند — یعنی دبیری که نقش و
     اشتراکش را گرفته، دوباره در صفِ بررسی می‌نشست.

     اینجا مستقیم همان UPDATE زده می‌شود تا خودِ شرط سنجیده شود. */
  const lateUpdate = await execute(
    `update teacher_requests
        set status = 'pending', school = 'نباید اعمال شود'
      where id = ? and user_id = ? and status = 'needs_revision'`,
    [requestId, user.id],
  );
  is(lateUpdate, 0, "⚠️ UPDATEِ دیرهنگام روی پروندهٔ تأییدشده هیچ ردیفی را نگرفت");

  const afterLate = await queryOne<{ status: string; school: string }>(
    "select status, school from teacher_requests where id = ?",
    [requestId],
  );
  is(afterLate?.status, "approved", "⚠️ پروندهٔ تأییدشده به pending برنگشت");
  is(afterLate?.school, "دبیرستان اصلاح‌شده", "اطلاعاتش دست‌نخورده ماند");

  /* ── ۷.۵) اعلان: شکستِ واقعی نباید بی‌صدا «موفق» شمرده شود ─────── */
  section("۷.۵) اعلان — تفکیکِ dedupe از خرابیِ اسکیما");

  const n1 = await notify({
    userId: user.id,
    kind: "teacher_approved",
    title: "آزمون — تأیید",
    dedupeKey: `${TAG}:approved:${user.id}`,
  });
  is(n1, "created", "اعلان تازه ساخته شد");

  const n2 = await notify({
    userId: user.id,
    kind: "teacher_approved",
    title: "آزمون — تکراری",
    dedupeKey: `${TAG}:approved:${user.id}`,
  });
  is(n2, "duplicate", "کلیدِ تکراری «duplicate» است و نه شکست");

  /* ⚠️ قلبِ این بخش: یک `kind` که در CHECK نیست — دقیقاً همان چیزی که
     «مهاجرت روی سرور اجرا نشده» می‌سازد.

     با `INSERT IGNORE`ِ قبلی، این حالت بی‌صدا «موفق» برمی‌گشت و اعلان
     ناپدید می‌شد. حالا باید `failed` بدهد. */
  const n3 = await notify({
    userId: user.id,
    // @ts-expect-error — عمداً مقداری بیرونِ اتحاد، برای شبیه‌سازیِ
    // دیتابیسی که مهاجرتش اجرا نشده.
    kind: "kind_that_does_not_exist",
    title: "آزمون — مهاجرتِ اجرانشده",
  });
  is(n3, "failed", "⚠️ نوعِ ناشناخته (مهاجرتِ اجرانشده) «failed» است و نه موفقیتِ بی‌صدا");

  const notifCount = await queryOne<{ n: number }>(
    "select count(*) as n from plus_notifications where user_id = ?",
    [user.id],
  );
  is(notifCount?.n, 1, "فقط یک ردیفِ اعلان نوشته شد");

  /* ── ۸) teacher_schools ────────────────────────────────────────── */
  section("۸) عضویت دبیر در مدرسه");
  const school = await findOrCreateSchool({
    name: "دبیرستان نمونهٔ آزمون",
    provinceId: PROVINCE,
    cityId: CITY,
    createdBy: user.id,
  });
  const link1 = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_schools where teacher_id = ? and school_id = ?",
    [user.id, school.id],
  );
  is(link1?.n, 1, "رابطهٔ دبیر↔مدرسه ساخته شد");

  // دبیرِ دوم، همان مدرسه
  const teacher2 = await makeUser("second-teacher");
  const sameSchool = await findOrCreateSchool({
    name: "دبیرستان نمونهٔ آزمون",
    provinceId: PROVINCE,
    cityId: CITY,
    createdBy: teacher2.id,
  });
  is(sameSchool.id, school.id, "دبیر دوم به همان مدرسه وصل شد (ردیف تکراری نساخت)");

  const members = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_schools where school_id = ?",
    [school.id],
  );
  is(members?.n, 2, "یک مدرسه دو دبیر دارد");

  // فراخوانیِ دوباره نباید ردیف تکراری بسازد
  await findOrCreateSchool({
    name: "دبیرستان نمونهٔ آزمون",
    provinceId: PROVINCE,
    cityId: CITY,
    createdBy: user.id,
  });
  const membersAgain = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_schools where school_id = ?",
    [school.id],
  );
  is(membersAgain?.n, 2, "⚠️ فراخوانیِ دوباره ردیف تکراری نساخت");

  /* ══════════════════════ لغوِ دسترسیِ دبیری ═══════════════════════ */
  section("لغوِ دسترسیِ دبیری");

  /* صحنه: یک دبیرِ تأییدشده با کلاس، دانش‌آموز، بازخورد، و سه اشتراک از
     سه منبعِ متفاوت. */
  const revokee = await makeUser("revokee");
  /* ⚠️ از مسیرِ **واقعیِ** ثبت و نه یک INSERT خام: فقط این مسیر ردیفِ
     `submitted` را در تاریخچه می‌نویسد، و تاریخچه همان چیزی است که پنلِ
     ادمین نشان می‌دهد. (نسخهٔ اول INSERT خام داشت و تستِ تاریخچه درست
     گرفتش: پرونده‌ای با یک رویداد به‌جای دو تا.) */
  const revokeeSubmit = await submitTeacherRequest({
    user: revokee,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان لغو",
    document: doc("revokee"),
  });
  if (!revokeeSubmit.ok) bad("ثبتِ درخواستِ revokee", revokeeSubmit.error);
  const revokeeRequest = await queryOne<{ id: string }>(
    "select id from teacher_requests where user_id = ?",
    [revokee.id],
  );
  const approvedRevokee = await approveTeacherRequest(revokeeRequest!.id, adminId);
  is(approvedRevokee.kind, "approved", "دبیرِ آزمون تأیید شد");

  /* اشتراکِ خریداری‌شده و هدیهٔ دستی — هیچ‌کدام نباید لغو شوند. */
  const purchaseId = randomUUID();
  const manualId = randomUUID();
  await execute(
    `insert into plus_entitlements (id, user_id, source, starts_at, ends_at, reason)
     values (?, ?, 'purchase', ?, ?, 'خریدِ آزمون')`,
    [purchaseId, revokee.id, new Date(), new Date(Date.now() + 90 * 864e5)],
  );
  await execute(
    `insert into plus_entitlements (id, user_id, source, starts_at, ends_at, reason)
     values (?, ?, 'manual_grant', ?, null, 'هدیهٔ آزمون')`,
    [manualId, revokee.id, new Date()],
  );

  /* یک کلاس با یک دانش‌آموزِ فعال. */
  const revClass = await createClass({
    teacherId: revokee.id,
    schoolId: school.id,
    name: `${TAG} کلاسِ لغو`,
    grade: "11",
  });
  const pupil = await makeUser("pupil");
  const joined = await joinClassByCode(pupil.id, revClass.joinCode);
  is(joined.ok, true, "دانش‌آموز عضوِ کلاس شد");
  is(await teacherCanSeeStudent(revokee.id, pupil.id), true, "و دبیر عملکردش را می‌بیند");

  const fb = await createFeedback({
    teacherId: revokee.id,
    teacherName: "آزمون دبیری",
    studentId: pupil.id,
    classId: revClass.id,
    category: "general",
    message: "پیش از لغو نوشته شد.",
  });
  is(fb.ok, true, "بازخوردی پیش از لغو ثبت شد");

  /* ── خودِ لغو ─────────────────────────────────────────────────── */
  const outcome = await revokeTeacher(revokee.id);
  is(outcome.kind, "revoked", "لغو انجام شد");
  if (outcome.kind === "revoked") {
    is(outcome.plusRevoked, 1, "دقیقاً یک اشتراکِ دبیری لغو شد");
    is(outcome.classesClosed, 1, "و عضوگیریِ یک کلاس بسته شد");
  }

  /* ── نقش ─────────────────────────────────────────────────────── */
  const afterRole = await queryOne<{ role: string }>("select role from users where id = ?", [
    revokee.id,
  ]);
  is(afterRole?.role, "student", "نقش به دانش‌آموز برگشت");

  /* ── اشتراک‌ها ───────────────────────────────────────────────── */
  const ents = await query<{ id: string; source: string; revoked_at: string | null }>(
    "select id, source, revoked_at from plus_entitlements where user_id = ?",
    [revokee.id],
  );
  const bySource = new Map(ents.map((e) => [e.source, e]));
  truthy(bySource.get("teacher_verified")?.revoked_at, "اشتراکِ دبیری لغو شد");
  /* ⚠️ مهم‌ترین دو بررسیِ این بخش: لغوِ دبیری نباید پولِ کاربر را بسوزاند. */
  is(bySource.get("purchase")?.revoked_at, null, "اشتراکِ خریداری‌شده دست‌نخورده ماند");
  is(bySource.get("manual_grant")?.revoked_at, null, "هدیهٔ دستی هم دست‌نخورده ماند");

  /* ── کلاس ────────────────────────────────────────────────────── */
  const afterClass = await queryOne<{ join_enabled: number; is_active: number }>(
    "select join_enabled, is_active from teacher_classes where id = ?",
    [revClass.id],
  );
  is(Number(afterClass?.join_enabled), 0, "عضوگیریِ کلاس بسته شد");
  is(Number(afterClass?.is_active), 1, "ولی کلاس بایگانی نشد");

  /* ⚠️ و کدِ کلاس دیگر کسی را وارد نمی‌کند — بدونِ اینکه چرخانده شود. */
  const latecomer = await makeUser("latecomer");
  is(
    (await joinClassByCode(latecomer.id, revClass.joinCode)).ok,
    false,
    "کدِ کلاس دیگر عضوِ تازه نمی‌پذیرد",
  );

  /* ── سابقه ───────────────────────────────────────────────────── */
  const memberStill = await queryOne<{ status: string }>(
    "select status from class_members where class_id = ? and student_id = ?",
    [revClass.id, pupil.id],
  );
  is(memberStill?.status, "active", "عضویتِ دانش‌آموز حذف نشد");

  is(
    (await listStudentFeedback(pupil.id)).length,
    1,
    "بازخوردِ قبلی برای دانش‌آموز باقی ماند",
  );

  /* ⚠️ درخواست باید `approved` بماند — یک واقعیتِ تاریخی است و لغوِ امروز
     نباید بازنویسی‌اش کند. */
  const requestAfter = await queryOne<{ status: string }>(
    "select status from teacher_requests where id = ?",
    [revokeeRequest!.id],
  );
  is(requestAfter?.status, "approved", "وضعیتِ درخواست همچنان «تأییدشده» است");

  /* ── دسترسی ──────────────────────────────────────────────────── */
  is(
    await teacherCanSeeStudent(revokee.id, pupil.id),
    false,
    "دسترسیِ دبیر به عملکردِ دانش‌آموز قطع شد",
  );
  is(
    await getStudentForTeacher(revokee.id, pupil.id),
    null,
    "و تحلیلِ دانش‌آموز هم برایش برنمی‌گردد",
  );

  /* ── خودتکرارپذیری ───────────────────────────────────────────── */
  const revokeAgain = await revokeTeacher(revokee.id);
  is(revokeAgain.kind, "not_teacher", "اجرای دوباره چیزی نمی‌نویسد");

  const entsAgain = await query<{ source: string; revoked_at: string | null }>(
    "select source, revoked_at from plus_entitlements where user_id = ?",
    [revokee.id],
  );
  is(
    entsAgain.filter((e) => e.revoked_at !== null).length,
    1,
    "و اشتراکِ دیگری لغو نشد",
  );

  /* ── غیرِدبیر ─────────────────────────────────────────────────── */
  const plainStudent = await makeUser("plain");
  const plainOutcome = await revokeTeacher(plainStudent.id);
  is(plainOutcome.kind, "not_teacher", "کاربرِ عادی قابلِ لغو نیست");

  /* ⚠️ مدیر هم نه — نقشِ `admin` نباید از این مسیر پایین بیاید. */
  const adminOutcome = await revokeTeacher(adminId);
  is(adminOutcome.kind, "not_teacher", "مدیر از این مسیر پایین نمی‌آید");
  if (adminOutcome.kind === "not_teacher") {
    is(adminOutcome.role, "admin", "و دلیلش هم روشن است");
  }
  const adminRole = await queryOne<{ role: string }>("select role from users where id = ?", [
    adminId,
  ]);
  is(adminRole?.role, "admin", "نقشِ مدیر دست‌نخورده ماند");

  is(
    (await revokeTeacher(randomUUID())).kind,
    "missing",
    "کاربرِ ناموجود بی‌خطر رد می‌شود",
  );

  /* ── هم‌زمانی ────────────────────────────────────────────────── */
  section("هم‌زمانیِ لغو");

  /* صحنهٔ دوم: یک دبیرِ تازه، و دو لغوِ کاملاً هم‌زمان. */
  const racer = await makeUser("racer");
  /* ⚠️ از مسیرِ **واقعیِ** ثبت و نه یک INSERT خام: فقط این مسیر ردیفِ
     `submitted` را در تاریخچه می‌نویسد، و تاریخچه همان چیزی است که پنلِ
     ادمین نشان می‌دهد. (نسخهٔ اول INSERT خام داشت و تستِ تاریخچه درست
     گرفتش: پرونده‌ای با یک رویداد به‌جای دو تا.) */
  const racerSubmit = await submitTeacherRequest({
    user: racer,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان مسابقه",
    document: doc("racer"),
  });
  if (!racerSubmit.ok) bad("ثبتِ درخواستِ racer", racerSubmit.error);
  const racerRequest = await queryOne<{ id: string }>(
    "select id from teacher_requests where user_id = ?",
    [racer.id],
  );
  await approveTeacherRequest(racerRequest!.id, adminId);

  const racerClass = await createClass({
    teacherId: racer.id,
    schoolId: school.id,
    name: `${TAG} کلاسِ مسابقه`,
    grade: "12",
  });

  const [r1, r2] = await Promise.all([
    revokeTeacher(racer.id),
    revokeTeacher(racer.id),
  ]);

  /* ⚠️ دقیقاً یکی باید «revoked» باشد. اگر هر دو بودند، یعنی قفلِ ردیف
     کار نکرده و دو بار نوشته شده. */
  is(
    [r1.kind, r2.kind].filter((k) => k === "revoked").length,
    1,
    "از دو لغوِ هم‌زمان فقط یکی نوشت",
  );
  is(
    [r1.kind, r2.kind].filter((k) => k === "not_teacher").length,
    1,
    "و دومی دید که کاری نمانده",
  );

  const racerEnts = await query<{ revoked_at: string | null }>(
    "select revoked_at from plus_entitlements where user_id = ? and source = 'teacher_verified'",
    [racer.id],
  );
  is(racerEnts.length, 1, "فقط یک ردیفِ اشتراکِ دبیری وجود دارد");
  truthy(racerEnts[0]?.revoked_at, "و یک بار لغو شده");

  const racerRole = await queryOne<{ role: string }>("select role from users where id = ?", [
    racer.id,
  ]);
  is(racerRole?.role, "student", "وضعیتِ نهایی درست است");

  const racerClassAfter = await queryOne<{ join_enabled: number }>(
    "select join_enabled from teacher_classes where id = ?",
    [racerClass.id],
  );
  is(Number(racerClassAfter?.join_enabled), 0, "و کلاسش هم بسته شد");

  /* ── تاریخچهٔ پرونده، همان چیزی که پنلِ ادمین می‌خواند ─────────── */
  section("تاریخچهٔ پرونده");

  const revokeeHistory = await listRequestHistory(revokeeRequest!.id);
  truthy(revokeeHistory.length >= 2, `تاریخچه ${revokeeHistory.length} رویداد دارد`);
  /* ⚠️ ترتیب **زمانی** است و نه تازه‌ترین-اول: `listRequestHistory` با
     `order by created_at, id` می‌خواند و پنلِ ادمین همان را به‌صورت یک
     خطِ زمانی نشان می‌دهد — «ثبت شد → اصلاح خواسته شد → تأیید شد» همان
     ترتیبی است که آدم داستان را می‌خواند. */
  is(revokeeHistory[0]?.action, "submitted", "قدیمی‌ترین رویداد اول است");
  is(
    revokeeHistory[revokeeHistory.length - 1]?.action,
    "approved",
    "و تازه‌ترین رویداد آخر",
  );
  truthy(
    revokeeHistory[revokeeHistory.length - 1]?.actorName,
    "تصمیمِ ادمین نامِ بررسی‌کننده را دارد",
  );
  is(
    revokeeHistory.some((e) => e.action === "submitted"),
    true,
    "ثبتِ اولیه هم در تاریخچه هست",
  );
  /* ⚠️ `submitted` را خودِ کاربر انجام داده، پس نامِ ادمین ندارد. */
  is(
    revokeeHistory.find((e) => e.action === "submitted")?.actorName,
    null,
    "ثبتِ خودِ کاربر نامِ ادمین ندارد",
  );

  /* ── دیدِ دانش‌آموز بعد از لغوِ دبیر ──────────────────────────── */
  section("دانش‌آموزِ دبیرِ لغوشده");

  /* ⚠️ چرا این بخش لازم است: لغو عمداً هیچ‌چیزِ کلاس را حذف نمی‌کند، پس
     از دیدِ دانش‌آموز هیچ ستونی عوض نمی‌شود و کارت کاملاً عادی می‌ماند.
     تنها نشانه `users.role` است — و اگر کوئریِ دانش‌آموز آن را نخواند،
     او تا ابد فکر می‌کند کسی کارش را می‌بیند. */
  const pupilClasses = await listStudentClasses(pupil.id);
  const pupilCard = pupilClasses.find((c) => c.id === revClass.id);
  truthy(pupilCard, "کلاس هنوز در فهرستِ دانش‌آموز هست (حذف نشد)");
  is(pupilCard?.teacherActive, false, "⚠️ دانش‌آموز می‌بیند دبیر دیگر فعال نیست");
  is(pupilCard?.isActive, true, "و کلاس بایگانیِ دروغین نشده است");
  is(pupilCard?.status, "active", "و عضویتش هنوز فعال است");

  /* ── نمای عملیاتیِ ادمین ──────────────────────────────────────── */
  section("نمای عملیاتیِ ادمین — فهرستِ دبیران");

  const dir1 = await listTeacherDirectory({ search: TAG, limit: 50 });
  const ids1 = new Set(dir1.teachers.map((t) => t.id));

  is(ids1.has(user.id), true, "دبیرِ تأییدشده در فهرست هست");
  /* ⚠️ مهم‌ترین بررسیِ این بخش: مبنا `users.role` است و نه پروندهٔ
     `approved`. اگر روزی کسی کوئری را به `teacher_requests` ببندد،
     فهرستِ «دبیران فعال» پر می‌شود از کسانی که دیگر دبیر نیستند. */
  is(ids1.has(revokee.id), false, "⚠️ دبیرِ لغوشده در فهرست نیست");
  is(ids1.has(racer.id), false, "و دبیرِ لغوشدهٔ دوم هم نه");
  is(ids1.has(teacher2.id), false, "کاربری که فقط به مدرسه وصل است، دبیر شمرده نمی‌شود");
  is(ids1.has(adminId), false, "و مدیر هم دبیر شمرده نمی‌شود");

  const userRow = dir1.teachers.find((t) => t.id === user.id);
  truthy(userRow?.approvedAt, "تاریخِ تأیید خوانده شد");
  is(userRow?.hasTeacherPlus, true, "و اشتراکِ دبیری‌اش فعال دیده می‌شود");
  /* ⚠️ صفرِ واقعی و نه صفرِ ساختگی: این دبیر واقعاً کلاسی نساخته. */
  is(userRow?.classCount, 0, "دبیرِ بدونِ کلاس، صفر کلاس دارد");
  is(userRow?.studentCount, 0, "و صفر دانش‌آموز");
  is(userRow?.schools.includes("دبیرستان نمونهٔ آزمون"), true, "مدرسه‌اش هم آمد");

  /* ⚠️ مرزِ حریمِ خصوصی، روی خروجیِ سریال‌شده و نه روی نامِ فیلدها.
  
     کد ملی و کلیدِ سندِ کارگزینی فقط به بررسیِ *خودِ درخواست* تعلق دارند،
     جایی که مدیر باید سند را با هویت تطبیق دهد. فهرستِ عملیاتی چنین
     کاری نمی‌کند و نباید آن‌ها را حمل کند — نه در یک فیلد و نه در
     گوشه‌ای که یک `select *` ی روزی اضافه کند. */
  const dirJson = JSON.stringify(dir1);
  is(dirJson.includes("0499370899"), false, "⚠️ کد ملی در فهرستِ دبیران نیست");
  is(dirJson.includes(`${TAG}-first.pdf`), false, "⚠️ کلیدِ سندِ کارگزینی هم نیست");

  const dirNone = await listTeacherDirectory({ search: "zzz-no-such-teacher-zzz" });
  is(dirNone.teachers.length, 0, "جست‌وجوی بی‌نتیجه، فهرستِ خالی می‌دهد");
  is(dirNone.total, 0, "و total هم صفر است");

  /* ── نمای پشتیبانی: کلاس‌های یک دبیر ──────────────────────────── */
  section("نمای پشتیبانی — کلاس‌های دبیر");

  /* ⚠️ عمداً روی دبیرِ **لغوشده**: تیکتِ پشتیبانی دقیقاً وقتی باز می‌شود
     که چیزی خراب است، و اگر این نما فقط دبیرانِ سالم را نشان دهد، در
     همان لحظه‌ای که لازم است کار نمی‌کند. */
  const support = await getTeacherSupportView(revokee.id);
  truthy(support, "نمای پشتیبانیِ دبیرِ لغوشده هم باز می‌شود");
  const supportClass = support?.classes.find((c) => c.id === revClass.id);
  truthy(supportClass, "کلاسش دیده می‌شود");
  is(supportClass?.joinEnabled, false, "⚠️ «عضوگیری بسته» درست گزارش شد");
  is(supportClass?.isActive, true, "و «بایگانی‌نشده» هم درست");
  is(supportClass?.memberCount, 1, "شمارِ اعضای فعال درست است");
  is(supportClass?.schoolName, "دبیرستان نمونهٔ آزمون", "نامِ مدرسه آمد");

  /* ⚠️ حساس‌ترین بررسیِ کلِ این نما.

     کدِ عضویت نباید از سرور بیرون بیاید — نه در یک فیلد، نه در یک
     فیلدِ فراموش‌شده، نه در هیچ گوشه‌ای از پاسخ. بررسی روی *کلِ*
     خروجیِ سریال‌شده است و نه روی نامِ فیلدها، چون یک `select *` ی که
     روزی اضافه شود، از بررسیِ اسمیِ فیلدها رد می‌شد. */
  const supportJson = JSON.stringify(support);
  is(
    supportJson.includes(revClass.joinCode),
    false,
    "⚠️ کدِ عضویتِ کلاس در خروجیِ پشتیبانی نیست",
  );
  is(supportJson.includes(pupil.id), false, "⚠️ و شناسهٔ هیچ دانش‌آموزی هم نیست");

  is(await getTeacherSupportView(randomUUID()), null, "کاربرِ ناموجود null می‌دهد");

  /* ── درخواستِ دوباره بعد از لغو ───────────────────────────────── */
  section("درخواستِ دوبارهٔ دبیری بعد از لغو");

  /* ⚠️ چرا این چرخه باید آزمون داشته باشد: پروندهٔ قدیمی عمداً `approved`
     می‌ماند و ایندکسِ «حداکثر یک پروندهٔ باز» هم سرِ جایش است. کافی بود
     یکی از آن دو با هم قاطی شوند تا کسی که دسترسی‌اش لغو شده، برای همیشه
     از درخواستِ دوباره محروم بماند — بدونِ هیچ پیامِ روشنی. */
  const stateAfterRevoke = await getTeacherAccountState(revokee);
  is(stateAfterRevoke.state, "none", "فرمِ درخواست دوباره برایش باز است");

  const reapply = await submitTeacherRequest({
    user: revokee,
    nationalId: "0499370899",
    provinceId: PROVINCE,
    cityId: CITY,
    school: "دبیرستان نمونهٔ آزمون",
    document: doc("reapply"),
  });
  is(reapply.ok, true, "درخواستِ تازه ثبت شد");
  if (!reapply.ok) {
    bad("ادامهٔ چرخهٔ درخواستِ دوباره", reapply.error);
    return;
  }
  is(reapply.request.status, "pending", "و در انتظارِ بررسی است");

  const oldRequestStill = await queryOne<{ status: string }>(
    "select status from teacher_requests where id = ?",
    [revokeeRequest!.id],
  );
  is(oldRequestStill?.status, "approved", "پروندهٔ قبلی دست‌نخورده «تأییدشده» ماند");

  const revokeeRequestCount = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_requests where user_id = ?",
    [revokee.id],
  );
  is(revokeeRequestCount?.n, 2, "حالا دو پرونده دارد: یکی تاریخی، یکی باز");

  const reapproved = await approveTeacherRequest(reapply.request.id, adminId);
  is(reapproved.kind, "approved", "تأییدِ دوباره انجام شد");

  const roleBack = await queryOne<{ role: string }>("select role from users where id = ?", [
    revokee.id,
  ]);
  is(roleBack?.role, "teacher", "نقشِ دبیر برگشت");

  /* ⚠️ اشتراکِ تازه ساخته می‌شود و ردیفِ لغوشده «رستاخیز» نمی‌کند: اگر
     `grantTeacherPlus` روزی فیلترِ `revoked_at is null` را از دست بدهد،
     یک تأییدِ تازه می‌توانست ردیفِ لغوشده را دوباره زنده کند و ردِ لغو
     را از تاریخ پاک کند. */
  const entsBack = await query<{ revoked_at: string | null }>(
    "select revoked_at from plus_entitlements where user_id = ? and source = 'teacher_verified'",
    [revokee.id],
  );
  is(entsBack.length, 2, "دو ردیفِ اشتراکِ دبیری هست: قبلی و تازه");
  is(entsBack.filter((e) => e.revoked_at === null).length, 1, "دقیقاً یکی فعال است");
  is(entsBack.filter((e) => e.revoked_at !== null).length, 1, "و ردیفِ لغوشده لغوشده ماند");

  /* ⚠️ و اشتراکِ خریداری‌شده هنوز دست‌نخورده است — نه لغو شده و نه
     دوباره ساخته شده. */
  const purchaseStill = await queryOne<{ revoked_at: string | null }>(
    "select revoked_at from plus_entitlements where id = ?",
    [purchaseId],
  );
  is(purchaseStill?.revoked_at, null, "اشتراکِ خریداری‌شده در کلِ چرخه دست‌نخورده ماند");

  /* ⚠️ کلاس‌ها **باز نمی‌شوند**. تأیید هیچ‌وقت `teacher_classes` را دست
     نمی‌زند، و این عمدی است: دبیر باید خودش تصمیم بگیرد کلاسِ قدیمی‌اش
     دوباره عضو بگیرد یا نه. باز کردنِ خودکار یعنی کدی که ماه‌ها جایی
     پخش شده، بی‌خبر دوباره کار کند. */
  const classAfterReapproval = await queryOne<{ join_enabled: number }>(
    "select join_enabled from teacher_classes where id = ?",
    [revClass.id],
  );
  is(
    Number(classAfterReapproval?.join_enabled),
    0,
    "⚠️ تأییدِ دوباره عضوگیریِ کلاسِ قدیمی را خودکار باز نمی‌کند",
  );

  is(
    await teacherCanSeeStudent(revokee.id, pupil.id),
    true,
    "دسترسی‌اش به دانش‌آموزِ همان کلاس برگشت",
  );

  const pupilAfter = (await listStudentClasses(pupil.id)).find((c) => c.id === revClass.id);
  is(pupilAfter?.teacherActive, true, "و دانش‌آموز دوباره دبیرِ فعال می‌بیند");

  /* ── شمارشِ یکتا و صفحه‌بندی ──────────────────────────────────── */
  section("شمارشِ یکتا و صفحه‌بندیِ فهرست");

  /* ⚠️ یک دانش‌آموز در دو کلاسِ یک دبیر باید **یک نفر** شمرده شود. بدونِ
     `count(distinct …)` عددِ «۲۴ دانش‌آموز» برای کلاسی که ۱۲ نفر در دو
     گروه دارد نوشته می‌شد — عددی که هیچ‌کس نمی‌فهمید از کجا آمده. */
  const secondClass = await createClass({
    teacherId: revokee.id,
    schoolId: school.id,
    name: `${TAG} کلاسِ دوم`,
    grade: "12",
  });
  is(
    (await joinClassByCode(pupil.id, secondClass.joinCode)).ok,
    true,
    "همان دانش‌آموز عضوِ کلاسِ دوم شد",
  );

  const dir2 = await listTeacherDirectory({ search: TAG, limit: 50 });
  const revokeeRow = dir2.teachers.find((t) => t.id === revokee.id);
  truthy(revokeeRow, "دبیرِ تأییدشدهٔ دوباره به فهرست برگشت");
  is(revokeeRow?.classCount, 2, "دو کلاس دارد");
  is(revokeeRow?.studentCount, 1, "⚠️ ولی یک دانش‌آموزِ یکتا");
  is(revokeeRow?.hasTeacherPlus, true, "و اشتراکِ دبیری‌اش دوباره فعال است");

  /* ⚠️ حالا دقیقاً دو دبیرِ آزمونی وجود دارد، پس صفحه‌بندی واقعاً سنجیده
     می‌شود و نه روی یک فهرستِ تک‌ردیفی. */
  is(dir2.total, 2, "فهرست دو دبیرِ آزمونی دارد");

  const dirPage = await listTeacherDirectory({ search: TAG, limit: 1 });
  is(dirPage.teachers.length, 1, "صفحهٔ یک‌ردیفی یک ردیف برگرداند");
  /* ⚠️ `total` باید کلِ نتیجه باشد و نه اندازهٔ صفحه — وگرنه دکمهٔ «نمایش
     بیشتر» هیچ‌وقت ظاهر نمی‌شود. */
  is(dirPage.total, 2, "ولی total همان تعدادِ کلِ نتیجه است");

  const dirNext = await listTeacherDirectory({ search: TAG, limit: 1, offset: 1 });
  is(dirNext.teachers.length, 1, "صفحهٔ دوم هم یک ردیف دارد");
  is(
    dirNext.teachers[0]?.id !== dirPage.teachers[0]?.id,
    true,
    "و ردیفِ صفحهٔ اول را تکرار نمی‌کند",
  );

  const revokeeEmail = await queryOne<{ email: string }>("select email from users where id = ?", [
    revokee.id,
  ]);
  const searchByEmail = await listTeacherDirectory({ search: revokeeEmail!.email });
  is(searchByEmail.teachers.length, 1, "جست‌وجو با ایمیل دقیقاً یک نفر می‌دهد");
  is(searchByEmail.teachers[0]?.id, revokee.id, "و همان نفرِ درست است");

  /* ── شمارشِ واقعیِ کوئری‌ها ───────────────────────────────────── */
  section("شمارشِ کوئری — اثباتِ نبودِ N+1");

  /* ⚠️ چرا این بخش با «نگاه کردن به کد» جایگزین نمی‌شود:

     N+1 از یک حلقهٔ صریح در کد نمی‌آید — آن را همه می‌بینند. از یک کوئریِ
     کمکیِ بی‌آزار می‌آید که کسی شش ماه بعد «فقط برای همین یک فیلد» داخلِ
     `map` می‌گذارد. تنها چیزی که آن را می‌گیرد، شمردنِ *واقعیِ* دستورهاست.

     `Com_select` شمارندهٔ خودِ سرور است، پس رهگیریِ درایور یا mock در کار
     نیست: هر SELECT ای که به MariaDB برسد شمرده می‌شود، از هر لایه‌ای که
     آمده باشد. */
  async function countSelects(run: () => Promise<unknown>): Promise<number> {
    const read = async () => {
      const row = await queryOne<{ Value: string }>(
        "show global status like 'Com_select'",
      );
      return Number(row?.Value ?? 0);
    };
    /* ⚠️ خودِ `show status` هم یک رفت‌وبرگشت است ولی `Com_select` را بالا
       نمی‌برد (در `Com_show_status` شمرده می‌شود)، پس در عدد نمی‌نشیند. */
    const before = await read();
    await run();
    return (await read()) - before;
  }

  const selectsOne = await countSelects(() => listTeacherDirectory({ search: TAG, limit: 1 }));
  const selectsMany = await countSelects(() => listTeacherDirectory({ search: TAG, limit: 50 }));

  is(selectsOne, 2, "فهرستِ یک‌ردیفی دقیقاً دو کوئری می‌زند (ردیف‌ها + مدرسه‌ها)");
  /* ⚠️ قلبِ این بخش: تعدادِ کوئری با تعدادِ دبیران عوض نمی‌شود. */
  is(selectsMany, 2, "⚠️ فهرستِ کامل هم دقیقاً دو کوئری می‌زند");
  is(selectsMany, selectsOne, "یعنی شمارِ کوئری مستقل از تعدادِ ردیف‌هاست");

  /* ⚠️ و همین قاعده برای نمای پشتیبانی: دبیرِ دوکلاسه نباید دو کوئریِ
     اضافه بزند. */
  const selectsSupport = await countSelects(() => getTeacherSupportView(revokee.id));
  is(selectsSupport, 2, "نمای پشتیبانی هم دو کوئری است (خودِ دبیر + کلاس‌ها)");

  /* ⚠️ فهرستِ کلاس‌های دانش‌آموز هم یک کوئری است و نه «یکی برای هر کلاس»؛
     `teacherActive` از همان `join` ی می‌آید که از قبل برای نامِ دبیر بود. */
  const selectsStudent = await countSelects(() => listStudentClasses(pupil.id));
  is(selectsStudent, 1, "فهرستِ کلاس‌های دانش‌آموز یک کوئری است");

  /* ── سقفِ نرخِ نوشتن‌های مدیریتی ───────────────────────────────── */
  section("سقفِ نرخِ نوشتن‌های مدیریتی");

  /* ⚠️ چرا این آزمون روی خودِ `adminWriteGate` است و نه روی Server Action:
     آن اکشن‌ها با `requireAdmin()` شروع می‌شوند که `cookies()` می‌خواند و
     بیرونِ Next اجرا نمی‌شود. گارد همان‌جا می‌ماند؛ چیزی که اینجا سنجیده
     می‌شود، خودِ شمارنده است — با همان ثابت‌ها و همان کلیدی که اکشن
     می‌فرستد و نه رونوشتی از آن‌ها. */
  const limiterAdmin = randomUUID();
  const otherAdmin = randomUUID();

  /* سطلِ لغو: ده تلاش مجاز، یازدهمی نه. */
  let deniedAt = 0;
  for (let i = 1; i <= TEACHER_REVOKE_LIMIT + 1; i++) {
    const message = await adminWriteGate(limiterAdmin, "revoke");
    if (message !== null && deniedAt === 0) deniedAt = i;
  }
  is(deniedAt, TEACHER_REVOKE_LIMIT + 1, `لغو دقیقاً بعد از ${TEACHER_REVOKE_LIMIT} بار بسته شد`);

  const denial = await adminWriteGate(limiterAdmin, "revoke");
  truthy(denial, "و بعدش هم بسته می‌ماند");
  /* ⚠️ پیام باید بگوید چقدر صبر کند، وگرنه مدیر فقط دوباره می‌زند. */
  truthy(denial?.includes("ثانیه"), "پیامِ رد، زمانِ انتظار را می‌گوید");

  /* ⚠️ مهم‌ترین بررسیِ این بخش: سطلِ «رسیدگی» با سطلِ «لغو» یکی نیست.
     اگر یکی بودند، یک بعدازظهرِ عادیِ رسیدگی به صف، دکمهٔ لغو را هم
     می‌بست — و برعکس، ده لغو کلِ کارِ مدیر را قفل می‌کرد. */
  is(await adminWriteGate(limiterAdmin, "review"), null, "ولی سطلِ رسیدگی همچنان باز است");

  /* ⚠️ و سهمیه به ازای هر مدیر است: بسته شدنِ یکی، بقیه را نمی‌بندد. */
  is(await adminWriteGate(otherAdmin, "revoke"), null, "مدیرِ دیگر سهمیهٔ خودش را دارد");

  is(
    adminWriteKey(limiterAdmin, "revoke") !== adminWriteKey(limiterAdmin, "review"),
    true,
    "کلیدِ دو سطل از هم جداست",
  );
  truthy(TEACHER_REVIEW_LIMIT > TEACHER_REVOKE_LIMIT, "سقفِ رسیدگی از سقفِ لغو بازتر است");

  await execute("delete from rate_limits where `key` like 'admin-teacher-%'");

  /* ── پاک‌سازی ──────────────────────────────────────────────────── */
  section("پاک‌سازی");
  await execute("delete from teacher_schools where school_id = ?", [school.id]);
  await execute("delete from teacher_classes where school_id = ?", [school.id]);
  await execute("delete from schools where id = ?", [school.id]);
  /* ⚠️ همهٔ کاربرانِ آزمون با همین پیشوند ساخته شده‌اند؛ فهرستِ دستی با
     هر آزمونِ تازه از قلم می‌افتاد. */
  await execute("delete from users where email like ?", [`${TAG}-%`]);
  const left = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_requests where user_id = ?",
    [user.id],
  );
  is(left?.n, 0, "همهٔ دادهٔ آزمون پاک شد (cascade کار کرد)");

  console.log(
    `\n${checks} بررسی — ${failures === 0 ? "همه سالم" : `${failures} شکست`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nآزمون با خطا متوقف شد:\n", err);
  process.exit(1);
});
