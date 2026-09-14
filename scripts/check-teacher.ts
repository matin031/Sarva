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
import { getLatestTeacherRequest } from "@/lib/teacher/requests";
import { listMyVerificationHistory } from "@/lib/teacher/verification-log";
import { findOrCreateSchool } from "@/lib/teacher/schools";
// ⚠️ همان تابعی که Server Action ادمین صدا می‌زند — نه رونوشتِ آن.
import { approveTeacherRequest } from "@/lib/teacher/review";
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

  /* ── پاک‌سازی ──────────────────────────────────────────────────── */
  section("پاک‌سازی");
  await execute("delete from teacher_schools where school_id = ?", [school.id]);
  await execute("delete from teacher_classes where school_id = ?", [school.id]);
  await execute("delete from schools where id = ?", [school.id]);
  await execute("delete from users where id in (?, ?, ?)", [user.id, teacher2.id, adminId]);
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
