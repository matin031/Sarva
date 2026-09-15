/**
 * آزمونِ end-to-endِ چرخهٔ عضویت در کلاس روی یک دیتابیس واقعی —
 * `npm run db:check-classes`.
 *
 * ⚠️ چرا اینجا و نه در `tests/`:
 *
 * `tests/teacher/membership.test.ts` قاعدهٔ خالص را می‌سنجد. آنچه اینجا
 * سنجیده می‌شود چیزی است که mock نمی‌تواند جعلش کند:
 *
 *   • تراکنش و `for update` — دو درخواستِ هم‌زمانِ «پیوستن».
 *   • ایندکسِ یکتای (کلاس، دانش‌آموز).
 *   • بندهای `CHECK` روی خودِ سرور.
 *   • و مهم‌تر از همه: اینکه **پیش‌نمایش هیچ ردیفی نمی‌نویسد**.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز با پیشوندِ `zz-classcheck` ساخته و در
 * پایان پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, queryOne } from "@/lib/db";
import {
  allowRejoin,
  createClass,
  getTeacherClass,
  joinClassByCode,
  leaveClass,
  listClassMembers,
  listStudentClasses,
  previewClassByCode,
  removeClassMember,
  rotateJoinCode,
  setClassActive,
  setJoinEnabled,
  teacherCanSeeStudent,
} from "@/lib/teacher/classes";
import { createFeedback, listStudentFeedback } from "@/lib/teacher/feedback";
import { normalizeSchoolName } from "@/lib/teacher/school-name";

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

const TAG = "zz-classcheck";

async function makeUser(suffix: string, role: "student" | "teacher"): Promise<string> {
  const id = randomUUID();
  await execute(
    "insert into users (id, email, role, first_name, last_name) values (?, ?, ?, 'آزمون', ?)",
    [id, `${TAG}-${suffix}-${id.slice(0, 8)}@example.test`, role, suffix],
  );
  return id;
}

async function makeSchool(): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into schools (id, name, name_key, province_id, city_id)
     values (?, ?, ?, 'IR001', 'IR001001')`,
    [id, `${TAG}-مدرسه`, normalizeSchoolName(`${TAG}-مدرسه`)],
  );
  return id;
}

async function memberCount(classId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "select count(*) as n from class_members where class_id = ?",
    [classId],
  );
  return Number(row?.n ?? 0);
}

async function statusOf(classId: string, studentId: string): Promise<string | null> {
  const row = await queryOne<{ status: string }>(
    "select status from class_members where class_id = ? and student_id = ?",
    [classId, studentId],
  );
  return row?.status ?? null;
}

async function main() {
  console.log("آزمونِ چرخهٔ عضویت در کلاس روی دیتابیس واقعی\n");

  const schoolId = await makeSchool();
  const teacherA = await makeUser("teacherA", "teacher");
  const teacherB = await makeUser("teacherB", "teacher");
  const alice = await makeUser("alice", "student");
  const bob = await makeUser("bob", "student");

  /* ── ۱) ساختِ کلاس ─────────────────────────────────────────────── */
  section("۱) ساختِ کلاس");

  const klass = await createClass({
    teacherId: teacherA,
    schoolId,
    name: `${TAG} یازدهم ۱`,
    grade: "11",
  });
  truthy(klass.id, "کلاس ساخته شد");
  is(klass.joinEnabled, true, "عضوگیری پیش‌فرض باز است");
  is(klass.isActive, true, "و کلاس فعال است");
  truthy(/^[A-Z2-9]{6,10}$/.test(klass.joinCode), "کدِ عضویت با الگو می‌خواند");

  const other = await createClass({
    teacherId: teacherB,
    schoolId,
    name: `${TAG} کلاس ب`,
    grade: "10",
  });
  truthy(other.joinCode !== klass.joinCode, "کدِ دو کلاس یکی نیست");

  /* ── ۲) پیش‌نمایش هیچ چیزی نمی‌نویسد ──────────────────────────── */
  section("۲) پیش‌نمایش");

  const before = await memberCount(klass.id);
  const preview = await previewClassByCode(alice, klass.joinCode);
  const after = await memberCount(klass.id);

  is(after, before, "پیش‌نمایش هیچ ردیفی نساخت");
  truthy(preview.ok, "پیش‌نمایش موفق بود");
  if (preview.ok) {
    is(preview.preview.className, klass.name, "نامِ کلاس برگشت");
    is(preview.preview.schoolName, `${TAG}-مدرسه`, "نامِ مدرسه برگشت");
    is(preview.preview.grade, "11", "پایه برگشت");
    is(preview.preview.joinable, true, "قابلِ عضویت است");
    is(preview.preview.alreadyMember, false, "و هنوز عضو نیست");

    /* ⚠️ هیچ فیلدِ خصوصی‌ای نباید در خروجی باشد. */
    const keys = Object.keys(preview.preview).sort();
    const leaked = keys.filter((k) =>
      /email|phone|national|document|teacherId|studentId|code|count/i.test(k),
    );
    is(leaked.length, 0, `پیش‌نمایش فیلدِ خصوصی ندارد (${keys.join(", ")})`);
  }

  const badCode = await previewClassByCode(alice, "ZZZZZZ");
  is(badCode.ok, false, "کدِ ناموجود رد می‌شود");

  /* ── ۳) عضویت ─────────────────────────────────────────────────── */
  section("۳) عضویت");

  const joined = await joinClassByCode(alice, klass.joinCode);
  is(joined.ok, true, "عضویت با کدِ معتبر انجام شد");
  is(await statusOf(klass.id, alice), "active", "وضعیت active است");
  is(await teacherCanSeeStudent(teacherA, alice), true, "دبیر عملکردش را می‌بیند");

  const again = await joinClassByCode(alice, klass.joinCode);
  is(again.ok, true, "وارد کردنِ دوبارهٔ کد خطا نمی‌دهد");
  is(await memberCount(klass.id), 1, "و ردیفِ دوم نساخت");

  /* ⚠️ دو درخواستِ کاملاً هم‌زمان — همان حالتی که `for update` برایش هست. */
  const bobRace = await Promise.all([
    joinClassByCode(bob, klass.joinCode),
    joinClassByCode(bob, klass.joinCode),
  ]);
  is(bobRace.every((r) => r.ok), true, "هر دو درخواستِ هم‌زمان موفق شدند");
  const bobRows = await queryOne<{ n: number }>(
    "select count(*) as n from class_members where class_id = ? and student_id = ?",
    [klass.id, bob],
  );
  is(Number(bobRows?.n ?? 0), 1, "ولی فقط یک ردیفِ عضویت ساخته شد");

  /* ⚠️ دبیر نمی‌تواند عضوِ کلاسِ خودش شود. */
  is((await joinClassByCode(teacherA, klass.joinCode)).ok, false, "دبیر عضوِ کلاسِ خودش نمی‌شود");

  /* ── ۴) بستنِ عضوگیری ─────────────────────────────────────────── */
  section("۴) بستنِ عضوگیری در برابرِ بایگانی");

  const carol = await makeUser("carol", "student");
  is(await setJoinEnabled(teacherA, klass.id, false), true, "عضوگیری بسته شد");
  is((await joinClassByCode(carol, klass.joinCode)).ok, false, "عضوِ تازه رد می‌شود");

  /* ⚠️ اعضای فعلی نباید اثری ببینند. */
  is(await statusOf(klass.id, alice), "active", "عضوِ فعلی همچنان عضو است");
  is(await teacherCanSeeStudent(teacherA, alice), true, "و دسترسیِ دبیر قطع نشده");

  const closedPreview = await previewClassByCode(carol, klass.joinCode);
  truthy(closedPreview.ok, "پیش‌نمایش هنوز کار می‌کند");
  if (closedPreview.ok) {
    is(closedPreview.preview.joinable, false, "ولی می‌گوید قابلِ عضویت نیست");
    truthy(closedPreview.preview.reason, "و دلیلش را می‌گوید");
  }

  await setJoinEnabled(teacherA, klass.id, true);
  is((await joinClassByCode(carol, klass.joinCode)).ok, true, "با باز شدن دوباره، عضو می‌شود");

  /* بایگانی — مفهومِ جدا. */
  is(await setClassActive(teacherA, klass.id, false), true, "کلاس بایگانی شد");
  const dave = await makeUser("dave", "student");
  is((await joinClassByCode(dave, klass.joinCode)).ok, false, "کلاسِ بایگانی عضو نمی‌پذیرد");
  is(
    await teacherCanSeeStudent(teacherA, alice),
    true,
    "ولی دسترسیِ دبیر به اعضای فعلی می‌ماند",
  );
  await setClassActive(teacherA, klass.id, true);

  /* ── ۵) خروجِ خودخواسته و بازگشت ──────────────────────────────── */
  section("۵) خروجِ خودخواسته");

  is(await leaveClass(carol, klass.id), true, "دانش‌آموز خودش خارج شد");
  is(await statusOf(klass.id, carol), "removed", "وضعیت removed است");
  is(await teacherCanSeeStudent(teacherA, carol), false, "دسترسیِ دبیر همان لحظه قطع شد");
  is((await joinClassByCode(carol, klass.joinCode)).ok, true, "و می‌تواند دوباره برگردد");
  is(await statusOf(klass.id, carol), "active", "و دوباره فعال است");

  /* ── ۶) اخراج و بلاک ─────────────────────────────────────────── */
  section("۶) اخراج");

  is(await removeClassMember(teacherA, klass.id, carol), true, "دبیر او را بیرون گذاشت");
  is(await statusOf(klass.id, carol), "blocked", "وضعیت blocked است و نه removed");
  is(await teacherCanSeeStudent(teacherA, carol), false, "دسترسی همان لحظه قطع شد");

  /**
   * ⚠️ خودِ باگی که مهاجرت ۰۱۴ برایش نوشته شد: پیش از آن، همین خط موفق
   * می‌شد و اخراج‌شده بلافاصله برمی‌گشت.
   */
  const blockedRetry = await joinClassByCode(carol, klass.joinCode);
  is(blockedRetry.ok, false, "اخراج‌شده با همان کد برنمی‌گردد");
  is(await statusOf(klass.id, carol), "blocked", "و وضعیتش عوض نشد");

  const blockedPreview = await previewClassByCode(carol, klass.joinCode);
  truthy(blockedPreview.ok, "پیش‌نمایش برایش کار می‌کند");
  if (blockedPreview.ok) {
    is(blockedPreview.preview.joinable, false, "ولی قابلِ عضویت نیست");
    truthy(
      blockedPreview.preview.reason?.includes("پایان یافته"),
      "و پیامش دربارهٔ عضویتِ اوست، نه وضعیتِ کلاس",
    );
  }

  /* کلاسِ بسته هم نباید پیامش را عوض کند. */
  await setJoinEnabled(teacherA, klass.id, false);
  const stillBlocked = await previewClassByCode(carol, klass.joinCode);
  if (stillBlocked.ok) {
    truthy(
      stillBlocked.preview.reason?.includes("پایان یافته"),
      "حتی با عضوگیریِ بسته، پیامِ اخراج مقدم است",
    );
  }
  await setJoinEnabled(teacherA, klass.id, true);

  /* ── ۷) اجازهٔ بازگشت ─────────────────────────────────────────── */
  section("۷) اجازهٔ بازگشت");

  is(
    await allowRejoin(teacherB, klass.id, carol),
    false,
    "دبیرِ دیگری نمی‌تواند بلاک را بردارد",
  );
  is(await statusOf(klass.id, carol), "blocked", "و وضعیت دست‌نخورده ماند");

  is(await allowRejoin(teacherA, klass.id, carol), true, "دبیرِ خودش می‌تواند");
  is(await statusOf(klass.id, carol), "removed", "وضعیت به removed رفت");

  /* ⚠️ اجازه، خودش عضو نمی‌کند — دانش‌آموز باید خودش برگردد. */
  is(await teacherCanSeeStudent(teacherA, carol), false, "اجازه به‌تنهایی عضوش نکرد");
  is((await joinClassByCode(carol, klass.joinCode)).ok, true, "و حالا می‌تواند برگردد");

  /* ── ۸) چرخاندنِ کد ──────────────────────────────────────────── */
  section("۸) چرخاندنِ کد");

  const oldCode = klass.joinCode;
  const newCode = await rotateJoinCode(teacherA, klass.id);
  truthy(newCode, "کدِ تازه ساخته شد");
  truthy(newCode !== oldCode, "و با کدِ قبلی فرق دارد");

  const eve = await makeUser("eve", "student");
  is((await joinClassByCode(eve, oldCode)).ok, false, "کدِ قدیمی دیگر کار نمی‌کند");
  is((await previewClassByCode(eve, oldCode)).ok, false, "و پیش‌نمایشش هم نه");
  is((await joinClassByCode(eve, newCode!)).ok, true, "کدِ تازه کار می‌کند");

  /* ⚠️ اعضای فعلی نباید با چرخاندنِ کد چیزی از دست بدهند. */
  is(await statusOf(klass.id, alice), "active", "عضوِ فعلی سرِ جایش است");
  is(await teacherCanSeeStudent(teacherA, alice), true, "و دسترسیِ دبیر هم");

  /* ── ۹) IDOR ─────────────────────────────────────────────────── */
  section("۹) دسترسیِ بینِ دبیران");

  is(await setJoinEnabled(teacherB, klass.id, false), false, "دبیر ب عضوگیریِ کلاسِ الف را نمی‌بندد");
  is(await setClassActive(teacherB, klass.id, false), false, "و بایگانی‌اش هم نمی‌کند");
  is(await rotateJoinCode(teacherB, klass.id), null, "و کدش را نمی‌چرخاند");
  is(await removeClassMember(teacherB, klass.id, alice), false, "و عضوش را بیرون نمی‌گذارد");
  is(await teacherCanSeeStudent(teacherB, alice), false, "و عملکردش را نمی‌بیند");
  is((await listClassMembers(teacherB, klass.id)).length, 0, "و فهرستِ اعضایش خالی است");

  /* هیچ‌کدام از این‌ها نباید چیزی را عوض کرده باشند. */
  is(await statusOf(klass.id, alice), "active", "بعد از همهٔ این تلاش‌ها، وضعیت دست‌نخورده است");

  /* ── ۱۰) فهرستِ دانش‌آموز ────────────────────────────────────── */
  section("۱۰) فهرستِ کلاس‌های دانش‌آموز");

  const aliceClasses = await listStudentClasses(alice);
  is(aliceClasses.length, 1, "یک کلاس دارد");
  is(aliceClasses[0]?.status, "active", "و وضعیتش active است");

  /* اخراج‌شده باید کلاس را ببیند، ولی با وضعیتِ پایان‌یافته. */
  const frank = await makeUser("frank", "student");
  await joinClassByCode(frank, newCode!);
  await removeClassMember(teacherA, klass.id, frank);
  const frankClasses = await listStudentClasses(frank);
  is(frankClasses.length, 1, "اخراج‌شده کلاس را همچنان می‌بیند");
  is(frankClasses[0]?.status, "blocked", "با وضعیتِ blocked");

  /* ولی کسی که خودش رفته، نه. */
  const grace = await makeUser("grace", "student");
  await joinClassByCode(grace, newCode!);
  await leaveClass(grace, klass.id);
  is((await listStudentClasses(grace)).length, 0, "کسی که خودش رفته کلاس را نمی‌بیند");

  /* و هیچ‌کس کلاس‌های دیگری را نمی‌بیند. */
  is((await listStudentClasses(bob)).some((c) => c.id === other.id), false, "کلاسِ دبیرِ دیگر در فهرستش نیست");

  /* ── ۱۱) فهرستِ اعضا از دیدِ دبیر ────────────────────────────── */
  section("۱۱) فهرستِ اعضا");

  const members = await listClassMembers(teacherA, klass.id);
  const active = members.filter((m) => m.status === "active");
  const blocked = members.filter((m) => m.status === "blocked");
  truthy(active.length >= 2, `اعضای فعال در فهرست هستند (${active.length})`);
  truthy(blocked.length >= 1, `اخراج‌شده‌ها هم هستند تا بشود بازشان گرداند (${blocked.length})`);
  is(
    members.some((m) => m.studentId === grace),
    false,
    "ولی کسی که خودش رفته در فهرست نیست",
  );
  is(
    members.every((m) => m.status !== "removed"),
    true,
    "هیچ ردیفِ removed ای برنمی‌گردد",
  );

  /* ── ۱۲) شناسه‌های بدشکل ─────────────────────────────────────── */
  section("۱۲) شناسه‌های بدشکل");

  /* ⚠️ همه از راهِ لایهٔ داده می‌آیند، پس یک شناسهٔ بدشکل باید بی‌خطر رد
     شود و نه اینکه به یک خطای ۵۰۰ برسد. */
  for (const junk of ["", "not-a-uuid", "../../etc", "' or 1=1 --", "x".repeat(200)]) {
    const a = await getTeacherClass(teacherA, junk);
    const b = await teacherCanSeeStudent(teacherA, junk);
    if (a === null && b === false) ok(`«${junk.slice(0, 16)}» بی‌خطر رد شد`);
    else bad(`«${junk.slice(0, 16)}» بی‌خطر رد نشد`, JSON.stringify({ a, b }));
  }

  /* ── ۱۳) نقش و اشتراک ────────────────────────────────────────── */
  section("۱۳) نقش و اشتراک");

  /**
   * ⚠️ `desired_role` چیزی است که **خودِ کاربر** می‌نویسد و هیچ دسترسی‌ای
   * نمی‌دهد. تنها ستونِ معتبر `role` است که فقط از مسیرِ تأییدِ درخواست
   * نوشته می‌شود.
   */
  const pretender = await makeUser("pretender", "student");
  await execute("update users set desired_role = 'teacher' where id = ?", [pretender]);

  const pretenderClass = await createClass({
    teacherId: pretender,
    schoolId,
    name: `${TAG} کلاسِ مدعی`,
    grade: "12",
  });
  /* لایهٔ داده نقش را نمی‌سنجد (گاردش در Server Action است)، ولی آنچه
     اینجا سنجیده می‌شود این است که `desired_role` هیچ دری به کلاسِ
     دیگری باز نمی‌کند. */
  is(await getTeacherClass(pretender, klass.id), null, "desiredRole کلاسِ دیگری را باز نمی‌کند");
  is(await teacherCanSeeStudent(pretender, alice), false, "و دانش‌آموزِ دیگری را نشان نمی‌دهد");
  is(await removeClassMember(pretender, klass.id, alice), false, "و عضوی را بیرون نمی‌گذارد");
  await execute("delete from teacher_classes where id = ?", [pretenderClass.id]);

  /**
   * ⚠️ اشتراکِ پلاس **هیچ ربطی** به دسترسیِ دبیری ندارد.
   *
   * دبیرِ تأییدشده پلاسِ مادام‌العمر می‌گیرد، ولی جهتش یک‌طرفه است: پلاس
   * داشتن کسی را دبیر نمی‌کند. اگر این دو جایی قاطی شوند، هر خریدارِ
   * پلاس به کلاس‌ها دسترسی پیدا می‌کند.
   */
  const plusStudent = await makeUser("plusStudent", "student");
  await execute(
    `insert into plus_entitlements (id, user_id, source, starts_at, ends_at, reason)
     values (?, ?, 'manual_grant', ?, null, 'آزمون')`,
    [randomUUID(), plusStudent, new Date()],
  );
  is(await getTeacherClass(plusStudent, klass.id), null, "پلاس کلاسِ دبیر را باز نمی‌کند");
  is(await teacherCanSeeStudent(plusStudent, alice), false, "و عملکردِ کسی را نشان نمی‌دهد");

  /**
   * ⚠️ و برعکسش: دانش‌آموزِ **بدونِ** پلاس باید کاملاً بتواند عضوِ کلاس
   * شود و بازخورد بگیرد. اگر رابطهٔ دبیر و دانش‌آموز پشتِ paywall برود،
   * کلِ این قابلیت برای بیشترِ کاربران وجود ندارد.
   */
  const freeStudent = await makeUser("freeStudent", "student");
  const freeJoin = await joinClassByCode(freeStudent, newCode!);
  is(freeJoin.ok, true, "دانش‌آموزِ رایگان عضوِ کلاس می‌شود");
  is(await teacherCanSeeStudent(teacherA, freeStudent), true, "و دبیرش عملکردش را می‌بیند");

  const freeFeedback = await createFeedback({
    teacherId: teacherA,
    teacherName: "آقای احمدی",
    studentId: freeStudent,
    classId: klass.id,
    category: "general",
    message: "خوب پیش می‌روی.",
  });
  is(freeFeedback.ok, true, "و بازخورد هم می‌گیرد");
  is(
    (await listStudentFeedback(freeStudent)).length,
    1,
    "و بدونِ پلاس می‌تواند بخواندش",
  );

  /* ── ۱۴) بازخورد پس از خروج ──────────────────────────────────── */
  section("۱۴) بازخورد پس از خروج");

  await leaveClass(freeStudent, klass.id);
  is(
    await teacherCanSeeStudent(teacherA, freeStudent),
    false,
    "با خروج، دسترسیِ دبیر قطع می‌شود",
  );
  /* ⚠️ ولی بازخوردِ قبلی نباید ناپدید شود — دانش‌آموز آن را خوانده و
     ممکن است بعداً بخواهد دوباره ببیندش. */
  is(
    (await listStudentFeedback(freeStudent)).length,
    1,
    "ولی بازخوردِ قبلی سرِ جایش می‌ماند",
  );

  /* ── ۱۵) مسابقه‌ها ───────────────────────────────────────────── */
  section("۱۵) مسابقه‌ها");

  /* ⚠️ پیوستن هم‌زمان با بستنِ عضوگیری. هر نتیجه‌ای مجاز است جز
     «هم عضو شد و هم نشد» یا ردیفِ دوم. */
  const racer = await makeUser("racer", "student");
  await Promise.all([
    joinClassByCode(racer, newCode!),
    setJoinEnabled(teacherA, klass.id, false),
  ]);
  const racerRows = await queryOne<{ n: number }>(
    "select count(*) as n from class_members where class_id = ? and student_id = ?",
    [klass.id, racer],
  );
  truthy(Number(racerRows?.n ?? 0) <= 1, "پیوستن هم‌زمان با بستنِ عضوگیری ردیفِ دوم نساخت");
  await setJoinEnabled(teacherA, klass.id, true);

  /* دو بار حذفِ پشتِ سرِ هم — دومی باید بی‌اثر باشد و نه خطا. */
  await joinClassByCode(racer, newCode!);
  const [rm1, rm2] = await Promise.all([
    removeClassMember(teacherA, klass.id, racer),
    removeClassMember(teacherA, klass.id, racer),
  ]);
  is([rm1, rm2].filter(Boolean).length, 1, "فقط یکی از دو حذفِ هم‌زمان اثر کرد");
  is(await statusOf(klass.id, racer), "blocked", "و وضعیتِ نهایی درست است");

  /* خروجِ خودخواسته در برابرِ اخراجِ هم‌زمان — نتیجه هرچه باشد، باید یکی
     از دو وضعیتِ معتبر باشد و نه چیزِ سوم. */
  await allowRejoin(teacherA, klass.id, racer);
  await joinClassByCode(racer, newCode!);
  await Promise.all([
    leaveClass(racer, klass.id),
    removeClassMember(teacherA, klass.id, racer),
  ]);
  const finalStatus = await statusOf(klass.id, racer);
  truthy(
    finalStatus === "removed" || finalStatus === "blocked",
    `وضعیتِ نهاییِ خروج/اخراجِ هم‌زمان معتبر است (${finalStatus})`,
  );

  /* دو چرخشِ هم‌زمانِ کد — هر دو باید موفق شوند و کدِ نهایی یکی باشد. */
  const [c1, c2] = await Promise.all([
    rotateJoinCode(teacherA, klass.id),
    rotateJoinCode(teacherA, klass.id),
  ]);
  truthy(c1 && c2, "هر دو چرخشِ هم‌زمان موفق شدند");
  const current = await queryOne<{ join_code: string }>(
    "select join_code from teacher_classes where id = ?",
    [klass.id],
  );
  truthy(
    current?.join_code === c1 || current?.join_code === c2,
    "و کدِ ذخیره‌شده یکی از آن دوست",
  );
  /* ⚠️ و اعضای فعلی از هیچ‌کدام آسیب ندیدند. */
  is(await statusOf(klass.id, alice), "active", "اعضای فعلی از چرخش‌ها آسیب ندیدند");

  /* ── پاک‌سازی ────────────────────────────────────────────────── */
  await cleanup();

  console.log(`\n${checks} بررسی — ${failures === 0 ? "همه سالم" : `${failures} شکست`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

async function cleanup() {
  await execute("delete from users where email like ?", [`${TAG}-%`]);
  await execute("delete from schools where name = ?", [`${TAG}-مدرسه`]);
}

main().catch(async (err) => {
  console.error("\nآزمون با خطا متوقف شد:\n", err);
  await cleanup().catch(() => {});
  process.exit(1);
});
