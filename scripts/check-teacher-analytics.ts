/**
 * آزمونِ end-to-endِ تحلیلِ دبیر روی یک دیتابیس واقعی —
 * `npm run db:check-teacher-analytics`.
 *
 * ⚠️ چرا اینجا و نه در `tests/`:
 *
 * آنچه سنجیده می‌شود، **گاردِ دسترسی داخلِ خودِ SQL** است. یک تستِ واحد با
 * دیتابیسِ جعلی فقط ثابت می‌کند mock همان چیزی را برمی‌گرداند که به mock
 * گفته‌ایم — یعنی دقیقاً همان چیزی را جعل می‌کند که قرار است اثبات شود.
 *
 * چهار چیز اینجا و فقط اینجا قابلِ اثبات‌اند:
 *
 *   ۱) دبیر نمی‌تواند دانش‌آموزِ کلاسِ دبیرِ دیگری را ببیند، حتی با شناسهٔ
 *      درست در نوارِ آدرس.
 *   ۲) خروج از کلاس، دسترسی را همان لحظه قطع می‌کند.
 *   ۳) دانش‌آموزی که در دو کلاسِ *همین* دبیر است، تحلیلش دو برابر نمی‌شود.
 *   ۴) داشبوردِ کلاس N+1 ندارد — و این را فقط با **شمردنِ کوئری‌های واقعی**
 *      می‌شود ثابت کرد.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز با پیشوندِ `zz-analyticscheck` ساخته و
 * در پایان پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, getPool, query, queryOne } from "@/lib/db";
import {
  getClassDashboard,
  getStudentDailyActivity,
  getStudentForTeacher,
} from "@/lib/teacher/analytics";
import { getStudentReport } from "@/lib/teacher/student-report";
import { MIN_VERIFIED_FOR_ACCURACY } from "@/lib/teacher/analytics-rules";
import { resetTehranDayCache, tehranDayAvailable } from "@/lib/analytics/timezone";
import { normalizeSchoolName } from "@/lib/teacher/school-name";
import { recordStudentView, listMyViewers } from "@/lib/teacher/views";
import { countUnreadNotifications, listNotifications, markNotificationRead } from "@/lib/plus/notifications";
import { generateJoinCode } from "@/lib/teacher/join-code";

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

const TAG = "zz-analyticscheck";

/* ─────────────────────────── ساختِ صحنه ────────────────────────────── */

async function makeUser(suffix: string, role: "student" | "teacher"): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into users (id, email, role, first_name, last_name) values (?, ?, ?, 'آزمون', ?)`,
    [id, `${TAG}-${suffix}-${id.slice(0, 8)}@example.test`, role, suffix],
  );
  return id;
}

async function makeSchool(): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into schools (id, name, name_key, province_id, city_id)
     values (?, ?, ?, 'IR001', 'IR001001')`,
    // ⚠️ `name_key` پیش‌فرض ندارد — همان کلیدِ یکتاسازیِ نامِ مدرسه که
    //    `lib/teacher/school-name.ts` می‌سازد.
    [id, `${TAG}-مدرسه`, normalizeSchoolName(`${TAG}-مدرسه`)],
  );
  return id;
}

async function makeClass(teacherId: string, schoolId: string, name: string): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into teacher_classes (id, teacher_id, school_id, name, grade, join_code)
     values (?, ?, ?, ?, '10', ?)`,
    // ⚠️ همان تولیدکنندهٔ واقعی — کدِ دست‌ساز از CHECK رد نمی‌شود.
    [id, teacherId, schoolId, name, generateJoinCode()],
  );
  return id;
}

async function join(classId: string, studentId: string): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into class_members (id, class_id, student_id, status, joined_at)
     values (?, ?, ?, 'active', now(6) - interval 60 day)`,
    [id, classId, studentId],
  );
  return id;
}

/** چند پاسخِ «سنجیده‌شده» برای یک دانش‌آموز — از جدولِ پلِ وزن. */
async function seedBridgeAnswers(studentId: string, total: number, correct: number) {
  for (let i = 0; i < total; i++) {
    await execute(
      `insert into aruz_bridge_answers
         (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct, difficulty)
       values (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        randomUUID(),
        studentId,
        `عبارتِ ${i}`,
        i % 2 === 0 ? "مفاعیلن" : "فاعلاتن",
        "مفاعیلن",
        i < correct ? "correct" : "wrong",
        i < correct,
      ],
    );
  }
}

/* ───────────────────── شمارندهٔ کوئری ─────────────────────────────── */

/**
 * ⚠️ چرا خودِ درایور شمرده می‌شود و نه یک تخمین:
 *
 * «N+1 ندارد» ادعایی است که فقط با عدد قابلِ اثبات است. کوئری‌های یک
 * داشبورد به‌سادگی از دیدِ کسی که کد را می‌خواند پنهان می‌مانند — یک
 * `await` داخلِ `map` کافی است. پس متدهای خودِ pool پوشانده می‌شوند و
 * شمرده.
 */
function countQueries(): { stop: () => number } {
  const pool = getPool() as unknown as {
    query: (...args: unknown[]) => unknown;
    execute: (...args: unknown[]) => unknown;
  };
  const originalQuery = pool.query.bind(pool);
  const originalExecute = pool.execute.bind(pool);
  let n = 0;

  pool.query = (...args: unknown[]) => {
    n++;
    return originalQuery(...args);
  };
  pool.execute = (...args: unknown[]) => {
    n++;
    return originalExecute(...args);
  };

  return {
    stop() {
      pool.query = originalQuery as typeof pool.query;
      pool.execute = originalExecute as typeof pool.execute;
      return n;
    },
  };
}

/* ─────────────────────────────── main ──────────────────────────────── */

async function main() {
  console.log("آزمونِ تحلیلِ دبیر روی دیتابیس واقعی\n");

  const schoolId = await makeSchool();
  const teacherA = await makeUser("teacherA", "teacher");
  const teacherB = await makeUser("teacherB", "teacher");

  const classA1 = await makeClass(teacherA, schoolId, `${TAG}-کلاس ۱`);
  const classA2 = await makeClass(teacherA, schoolId, `${TAG}-کلاس ۲`);
  const classB1 = await makeClass(teacherB, schoolId, `${TAG}-کلاس دبیر ب`);

  const mine = await makeUser("mine", "student");
  const both = await makeUser("both", "student");
  const stranger = await makeUser("stranger", "student");
  const leaver = await makeUser("leaver", "student");

  await join(classA1, mine);
  await join(classA1, both);
  await join(classA2, both); // ⚠️ همان دانش‌آموز، دو کلاسِ همان دبیر
  await join(classB1, stranger);
  const leaverMembership = await join(classA1, leaver);

  /* ── ۱) گاردِ دسترسی ───────────────────────────────────────────── */
  section("۱) گاردِ دسترسی");

  ok((await getStudentForTeacher(teacherA, mine)) !== null ? "دبیر دانش‌آموزِ خودش را می‌بیند" : "");
  if ((await getStudentForTeacher(teacherA, mine)) === null) {
    failures++;
    console.log("  ✗ دبیر دانش‌آموزِ خودش را نمی‌بیند");
  }

  is(
    await getStudentForTeacher(teacherA, stranger),
    null,
    "دبیر دانش‌آموزِ کلاسِ دبیرِ دیگر را نمی‌بیند",
  );
  is(
    await getStudentForTeacher(teacherB, mine),
    null,
    "و برعکسش هم همین‌طور",
  );

  /* ⚠️ «شناسه را در نوارِ آدرس عوض کن» — همان حمله‌ای که این گارد برایش
     هست. نتیجه باید ۴۰۴/۴۰۳ باشد و نه یک کارنامه. */
  is(
    await getStudentReport(teacherA, stranger),
    null,
    "کارنامهٔ دانش‌آموزِ غریبه برنمی‌گردد",
  );
  is(
    await getStudentReport(teacherA, randomUUID()),
    null,
    "شناسهٔ کاملاً ناموجود هم null می‌دهد",
  );
  is(
    await getStudentDailyActivity(teacherA, stranger),
    null,
    "نمودارِ روزانهٔ غریبه هم برنمی‌گردد",
  );

  /* ⚠️ `classId` اشتباه: دانش‌آموز مالِ همین دبیر است ولی عضوِ آن کلاس
     نیست — نباید از راهِ کلاسِ دیگر دیده شود. */
  is(
    await getStudentForTeacher(teacherA, mine, classA2),
    null,
    "شناسهٔ کلاسِ اشتباه دسترسی نمی‌دهد",
  );
  is(
    await getStudentForTeacher(teacherA, mine, classB1),
    null,
    "شناسهٔ کلاسِ دبیرِ دیگر هم نه",
  );

  is(await getClassDashboard(teacherB, classA1), null, "داشبوردِ کلاسِ دیگری برنمی‌گردد");

  /* ── ۲) خروج از کلاس ───────────────────────────────────────────── */
  section("۲) خروج از کلاس");

  ok(
    (await getStudentForTeacher(teacherA, leaver)) !== null
      ? "عضوِ فعال دیده می‌شود"
      : "",
  );
  if ((await getStudentForTeacher(teacherA, leaver)) === null) {
    failures++;
    console.log("  ✗ عضوِ فعال دیده نمی‌شود");
  }

  await execute(
    "update class_members set status = 'removed', left_at = now(6) where id = ?",
    [leaverMembership],
  );

  is(
    await getStudentForTeacher(teacherA, leaver),
    null,
    "بعد از خروج، دسترسی همان لحظه قطع می‌شود",
  );
  is(await getStudentReport(teacherA, leaver), null, "کارنامه‌اش هم دیگر برنمی‌گردد");

  /* ⚠️ ولی ردیفِ تاریخچه باید بماند — «تاریخچهٔ classroom relation را حذف
     نکن». */
  const history = await execute(
    "update class_members set status = status where id = ? and status = 'removed'",
    [leaverMembership],
  );
  is(history, 1, "ردیفِ عضویت حذف نشده و تاریخچه می‌ماند");

  /* ── ۳) عضویت در دو کلاسِ یک دبیر ──────────────────────────────── */
  section("۳) عضویت در دو کلاسِ یک دبیر");

  const ref = await getStudentForTeacher(teacherA, both);
  is(ref?.classes.length, 2, "هر دو کلاس در یک رکورد فهرست می‌شوند");

  await seedBridgeAnswers(both, 20, 5);

  const report = await getStudentReport(teacherA, both);
  const bridge = report?.games.find((g) => g.key === "aruz-bridge");
  is(bridge?.total, 20, "تحلیل دو برابر نشده");
  is(bridge?.correct, 5, "شمارشِ درست‌ها دو برابر نشده");

  /* ── ۴) داده معتبر در برابر «داده نداریم» ─────────────────────── */
  section("۴) داده معتبر در برابر «داده نداریم»");

  const dash = await getClassDashboard(teacherA, classA1);
  const rowMine = dash?.students.find((s) => s.studentId === mine);
  const rowBoth = dash?.students.find((s) => s.studentId === both);

  is(rowMine?.accuracy, null, "دانش‌آموزِ بدونِ داده دقتش null است و نه صفر");
  is(rowMine?.answerCount, 0, "و شمارشش صفر است");
  is(rowBoth?.verifiedTotal, 20, "دانش‌آموزِ فعال ۲۰ پاسخِ سنجیده‌شده دارد");
  is(rowBoth?.accuracy, 5 / 20, "و دقتش واقعی است");
  is(
    rowBoth !== undefined && rowBoth.verifiedTotal >= MIN_VERIFIED_FOR_ACCURACY,
    true,
    "شواهد از حدِ لازم بیشتر است",
  );

  /* ⚠️ واژه‌یاب نباید در «سنجیده‌شده» بیاید — درستی‌اش را مرورگر فرستاده. */
  await execute(
    `insert into vocab_answers (id, user_id, grade, lesson, word, meaning, is_correct)
     values (?, ?, 'dahom', 1, 'واژه', 'معنی', 1)`,
    [randomUUID(), mine],
  );
  const dash2 = await getClassDashboard(teacherA, classA1);
  const rowMine2 = dash2?.students.find((s) => s.studentId === mine);
  is(rowMine2?.answerCount, 1, "پاسخِ واژه‌یاب در فعالیت شمرده می‌شود");
  is(rowMine2?.verifiedTotal, 0, "ولی در «سنجیده‌شده» نمی‌آید");
  is(rowMine2?.accuracy, null, "پس دقتی هم از آن ساخته نمی‌شود");
  ok(rowMine2?.lastActivityAt !== null ? "آخرین فعالیتش ثبت شده" : "");
  if (rowMine2?.lastActivityAt === null) {
    failures++;
    console.log("  ✗ آخرین فعالیتش ثبت نشده");
  }

  /* ── ۵) بازی‌های بدونِ ذخیره ──────────────────────────────────── */
  section("۵) بازی‌های بدونِ ذخیره");

  const lines = report?.games ?? [];
  is(lines.length, 7, "هر هفت بازی در فهرست هست");
  for (const key of ["aruz-rapid", "ninja", "pairs"]) {
    const line = lines.find((g) => g.key === key);
    if (line?.hasStoredResults === false && line.accuracy === null && line.total === 0) {
      ok(`«${line.label}» هیچ عددی نمی‌سازد`);
    } else {
      bad(`«${key}» باید بدونِ عدد باشد`, JSON.stringify(line));
    }
  }
  const vocabLine = lines.find((g) => g.key === "vocab");
  is(vocabLine?.clientReported, true, "واژه‌یاب به‌عنوانِ «گزارشِ مرورگر» علامت خورده");

  /* ── ۶) N+1 ───────────────────────────────────────────────────── */
  section("۶) N+1");

  /* ⚠️ بیست دانش‌آموزِ تازه، تا اگر کوئری‌ای به‌ازای هر نفر زده شود، در عدد
     دیده شود. */
  const crowd: string[] = [];
  for (let i = 0; i < 20; i++) {
    const id = await makeUser(`crowd${i}`, "student");
    crowd.push(id);
    await join(classA2, id);
  }

  const counter = countQueries();
  const big = await getClassDashboard(teacherA, classA2);
  const used = counter.stop();

  is(big?.students.length, 21, "۲۱ دانش‌آموز برگشت");
  if (used <= 4) ok(`داشبورد با ${used} کوئری ساخته شد (مستقل از تعدادِ دانش‌آموز)`);
  else bad("داشبورد N+1 دارد", `${used} کوئری برای ۲۱ دانش‌آموز`);

  /* ── ۷) صفحه‌بندیِ پایدار ─────────────────────────────────────── */
  section("۷) صفحه‌بندی");

  const p1 = await getClassDashboard(teacherA, classA2, 0, 10);
  const p2 = await getClassDashboard(teacherA, classA2, 10, 10);
  const ids1 = new Set(p1?.students.map((s) => s.studentId));
  const overlap = (p2?.students ?? []).filter((s) => ids1.has(s.studentId));

  is(p1?.students.length, 10, "صفحهٔ اول ۱۰ نفر دارد");
  is(p1?.hasMore, true, "و می‌داند ادامه دارد");
  is(overlap.length, 0, "صفحهٔ دوم هیچ تکراری از صفحهٔ اول ندارد");
  is(p1?.studentCount, 21, "شمارشِ کل مستقل از صفحه است");

  /* ── ۸) محافظِ منطقهٔ زمانی ───────────────────────────────────── */
  section("۸) محافظِ منطقهٔ زمانی");

  resetTehranDayCache();
  const tzReady = await tehranDayAvailable();
  const daily = await getStudentDailyActivity(teacherA, both);

  if (tzReady) {
    /* روی سروری که جدول‌ها بارگذاری شده‌اند، باید داده بدهد. */
    if (daily?.state === "ready" || daily?.state === "no_data") {
      ok(`جدول‌های منطقه هست — وضعیت «${daily.state}»`);
    } else {
      bad("با وجودِ جدول‌های منطقه، گزارش در دسترس نیست", JSON.stringify(daily));
    }
  } else {
    /* ⚠️ همان حالتی که کلِ این محافظ برایش نوشته شد: جدول‌ها نیستند، و
       نتیجه باید یک وضعیتِ **صریح** باشد و نه یک آرایهٔ خالی که شبیهِ
       «این دانش‌آموز هیچ کاری نکرده» خوانده می‌شود. */
    is(daily?.state, "unavailable", "بدونِ جدول‌های منطقه، وضعیت صریحاً «در دسترس نیست» است");
    is(daily?.days.length, 0, "و هیچ عددی نمی‌سازد");
    ok(daily?.note ? "و دلیلش برای کاربر نوشته شده" : "");
    if (!daily?.note) {
      failures++;
      console.log("  ✗ دلیلش برای کاربر نوشته نشده");
    }

    /* ⚠️ و مهم‌ترین نکته: بقیهٔ تحلیل باید **کار کند**. */
    const stillWorks = await getStudentReport(teacherA, both);
    is(
      stillWorks?.games.find((g) => g.key === "aruz-bridge")?.total,
      20,
      "تحلیلِ غیرروزانه بدونِ جدول‌های منطقه هم کار می‌کند",
    );
  }

  /* ── ۹) ثبتِ بازدید و ضدِ اسپمِ اعلان ─────────────────────────── */
  section("۹) ثبتِ بازدید و ضدِ اسپمِ اعلان");

  const viewer = {
    teacherId: teacherA,
    teacherName: "آقای احمدی",
    studentId: both,
    classId: classA1,
    className: "کلاس ۱",
  };

  /* ⚠️ همان کاری که یک دبیرِ واقعی می‌کند: صفحه را چند بار تازه می‌کند. */
  for (let i = 0; i < 5; i++) await recordStudentView(viewer);

  const views = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_student_views where teacher_id = ? and student_id = ?",
    [teacherA, both],
  );
  is(Number(views?.n ?? 0), 5, "هر پنج بازدید ثبت شد (ثبت دقیق است)");

  const notes = await query<{ n: number }>(
    "select count(*) as n from plus_notifications where user_id = ? and kind = 'teacher_viewed_student'",
    [both],
  );
  is(Number(notes[0]?.n ?? 0), 1, "ولی فقط **یک** اعلان ساخته شد");

  /* ⚠️ لحن: نامِ دبیر باید در متن باشد و متن نباید نظارتی باشد. */
  const note = await queryOne<{ title: string; body: string | null; href: string | null }>(
    "select title, body, href from plus_notifications where user_id = ? and kind = 'teacher_viewed_student'",
    [both],
  );
  ok(note?.title.includes("احمدی") ? "نامِ دبیر در متنِ اعلان هست" : "");
  if (!note?.title.includes("احمدی")) {
    failures++;
    console.log("  ✗ نامِ دبیر در متنِ اعلان نیست");
  }
  is(note?.href, "/panel/classes", "لینکِ اعلان داخلی است");

  /* ⚠️ دبیرِ دیگری که همان دانش‌آموز را ببیند، اعلانِ خودش را می‌سازد —
     یکتاسازی نباید دو دبیر را یکی کند. */
  await join(classB1, both);
  await recordStudentView({
    teacherId: teacherB,
    teacherName: "خانم رضایی",
    studentId: both,
    classId: classB1,
    className: "کلاس دبیر ب",
  });
  const notes2 = await queryOne<{ n: number }>(
    "select count(*) as n from plus_notifications where user_id = ? and kind = 'teacher_viewed_student'",
    [both],
  );
  is(Number(notes2?.n ?? 0), 2, "دبیرِ دوم اعلانِ جداگانهٔ خودش را ساخت");

  /* ── ۱۰) نمای خودِ دانش‌آموز ──────────────────────────────────── */
  section("۱۰) نمای خودِ دانش‌آموز");

  const viewers = await listMyViewers(both);
  is(viewers.length, 2, "دانش‌آموز هر دو بازدیدکننده را می‌بیند");
  ok(
    viewers.every((v) => v.className.length > 0)
      ? "نامِ کلاس در فهرست هست"
      : "",
  );

  /* ⚠️ و دانش‌آموزِ دیگری هیچ‌کدام را نمی‌بیند — این جدول خودش نباید به
     نشتی تبدیل شود. */
  is((await listMyViewers(mine)).length, 0, "دانش‌آموزِ دیگر بازدیدهای او را نمی‌بیند");

  /* ── ۱۱) مالکیتِ اعلان ────────────────────────────────────────── */
  section("۱۱) مالکیتِ اعلان");

  const bothNotes = await listNotifications(both);
  const mineNotes = await listNotifications(mine);
  ok(bothNotes.length > 0 ? "اعلان‌های خودِ کاربر خوانده می‌شوند" : "");
  if (bothNotes.length === 0) {
    failures++;
    console.log("  ✗ اعلان‌های خودِ کاربر خوانده نمی‌شوند");
  }
  is(
    mineNotes.some((n) => n.kind === "teacher_viewed_student"),
    false,
    "کاربرِ دیگر اعلان‌های او را نمی‌بیند",
  );

  /* ⚠️ «خوانده شد»ِ کاربر A نباید اعلانِ B را دست بزند. */
  const targetId = bothNotes[0].id;
  const unreadBefore = await countUnreadNotifications(both);
  await markNotificationRead(mine, targetId);
  const unreadAfter = await countUnreadNotifications(both);
  is(unreadAfter, unreadBefore, "mark-read کاربرِ دیگر اثری روی اعلانِ او ندارد");

  await markNotificationRead(both, targetId);
  is(
    await countUnreadNotifications(both),
    unreadBefore - 1,
    "ولی خودِ صاحبِ اعلان می‌تواند بخواندش",
  );

  /* ── پاک‌سازی ─────────────────────────────────────────────────── */
  await cleanup();

  console.log(
    `\n${checks} بررسی — ${failures === 0 ? "همه سالم" : `${failures} شکست`}\n`,
  );
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
