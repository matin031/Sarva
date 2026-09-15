import "server-only";
import { placeholders, query, queryOne } from "@/lib/db";
import type { Grade } from "@/lib/profile/schemas";

/**
 * فهرستِ دبیران و کلاس‌هایشان — برای **پشتیبانی**، نه مدیریتِ آموزشی.
 *
 * =============================================================================
 * ⚠️ مرزِ این ماژول
 * =============================================================================
 *
 * مدیر برای جوابِ یک تیکت باید بتواند بپرسد «این دبیر کیست، چند کلاس دارد،
 * وضعیتشان چیست» — بدونِ اینکه مجبور شود SQL Console باز کند.
 *
 * ولی همین و نه بیشتر. اینجا عمداً **نمی‌آید**:
 *
 *   • پاسخ و عملکردِ آموزشیِ هیچ دانش‌آموزی
 *   • بازخوردِ خصوصیِ دبیر به دانش‌آموز
 *   • کدِ عضویتِ خام یا QR — مدیر برای عیب‌یابی به «آیا عضوگیری باز است؟»
 *     نیاز دارد و نه به خودِ کد؛ دبیر کدش را در پنلِ خودش می‌بیند
 *   • کد ملی و حکمِ کارگزینی — آن‌ها فقط در بررسیِ خودِ درخواست‌اند، جایی
 *     که مدیر واقعاً باید سند را با هویت تطبیق دهد
 *   • صورتحساب، نشست، دستگاه
 *
 * هر چیزی که در این دو تایپ نیست، عمداً نیست.
 *
 * =============================================================================
 * ⚠️ چرا اینجا و نه در `lib/admin/teacher-directory.ts`
 * =============================================================================
 *
 * آن فایل `"use server"` است و با `requireAdmin()` شروع می‌شود، که
 * `cookies()` می‌خواند — یعنی بیرونِ یک درخواستِ Next اصلاً اجرا نمی‌شود و
 * `db:check-teacher` نمی‌تواند صدایش بزند. همان جدایی‌ای که
 * `lib/teacher/review.ts` دارد: گارد در اکشن، کوئری اینجا، و آزمون روی
 * *همین* تابع و نه روی رونوشتی از آن.
 */

/* ═════════════════════════ فهرستِ دبیران ══════════════════════════════ */

export type TeacherDirectoryRow = {
  id: string;
  fullName: string | null;
  /** برای پیدا کردنِ کاربر در تیکت پشتیبانی. */
  email: string | null;
  /** تازه‌ترین تأییدِ ثبت‌شده — ممکن است null باشد (نقش از راهِ دیگری آمده). */
  approvedAt: string | null;
  classCount: number;
  /** دانش‌آموزانِ **یکتا** در همهٔ کلاس‌هایش. */
  studentCount: number;
  /**
   * آیا اشتراکِ `teacher_verified`ِ فعال دارد؟
   *
   * ⚠️ این جدا از «دبیر بودن» است و باید جدا دیده شود: اگر کسی نقشِ دبیر
   * دارد ولی این خاموش است، یعنی جایی از چرخه نیمه‌کاره مانده — و بدونِ
   * این ستون، تنها راهِ فهمیدنش یک کوئریِ دستی بود.
   */
  hasTeacherPlus: boolean;
  /** نامِ مدرسه‌هایی که به آن‌ها وصل است. */
  schools: string[];
};

export const TEACHER_DIRECTORY_PAGE_SIZE = 25;
const TEACHER_DIRECTORY_MAX_PAGE = 100;

/**
 * دبیرانِ **فعلی** — یعنی `users.role = 'teacher'` و نه «هر کسی که روزی
 * تأیید شده».
 *
 * ⚠️ مبنا `role` است و نه `teacher_requests.status`. پروندهٔ تأییدشده یک
 * واقعیتِ تاریخی است و پس از لغوِ دسترسی هم `approved` می‌ماند (عمداً)؛
 * تکیه بر آن یعنی فهرستِ «دبیران فعال» پر از کسانی باشد که دیگر دبیر
 * نیستند.
 *
 * =============================================================================
 * ⚠️ دو کوئری، مستقل از تعدادِ دبیران
 * =============================================================================
 *
 * شمارنده‌ها زیرکوئریِ همبسته‌اند و نه حلقه در کد: یک رفت‌وبرگشت برای کلِ
 * صفحه. هر کدامشان روی ایندکسِ موجود می‌نشیند
 * (`teacher_classes(teacher_id, …)`، `class_members(class_id, status)`،
 * `plus_entitlements(user_id, revoked_at, …)`، `teacher_requests(user_id, …)`)
 * و صفحه هم کران‌دار است.
 *
 * مدرسه‌ها کوئریِ دوم‌اند و دسته‌ای (`teacher_id in (…)`) — چون چند ردیف به
 * ازای هر دبیر برمی‌گردانند و در زیرکوئریِ همبسته یا باید `GROUP_CONCAT`
 * بی‌کران می‌شد یا ردیف‌ها تکرار می‌شدند.
 */
export async function listTeacherDirectory(
  params: { search?: string; limit?: number; offset?: number } = {},
): Promise<{ teachers: TeacherDirectoryRow[]; total: number }> {
  const values: unknown[] = [];
  const conditions = ["u.role = 'teacher'"];

  const search = params.search?.trim();
  if (search) {
    /* ⚠️ هر `?` یک پارامتر مصرف می‌کند، پس الگو دو بار فرستاده می‌شود.
       ⚠️ و کد ملی عمداً در جست‌وجو **نیست**: اینجا فهرستِ عملیاتی است و
       نه بررسیِ سند؛ جست‌وجو با آن یعنی مدیر عادت کند کد ملی را جایی
       تایپ کند که لازم نیست. */
    const pattern = `%${search.toLowerCase()}%`;
    values.push(pattern, pattern);
    conditions.push("(lower(u.email) like ? or lower(u.full_name) like ?)");
  }

  const limit = Math.min(
    Math.max(params.limit ?? TEACHER_DIRECTORY_PAGE_SIZE, 1),
    TEACHER_DIRECTORY_MAX_PAGE,
  );
  values.push(limit, Math.max(params.offset ?? 0, 0));

  const rows = await query<{
    id: string;
    full_name: string | null;
    email: string | null;
    approved_at: string | null;
    class_count: number;
    student_count: number;
    plus_active: number;
    total_count: number;
  }>(
    `select u.id, u.full_name, u.email,
            (select max(r.reviewed_at) from teacher_requests r
              where r.user_id = u.id and r.status = 'approved')        as approved_at,
            (select count(*) from teacher_classes c
              where c.teacher_id = u.id)                               as class_count,
            (select count(distinct m.student_id)
               from class_members m
               join teacher_classes c on c.id = m.class_id
              where c.teacher_id = u.id and m.status = 'active')       as student_count,
            (select count(*) from plus_entitlements e
              where e.user_id = u.id
                and e.source = 'teacher_verified'
                and e.revoked_at is null)                              as plus_active,
            count(*) over ()                                           as total_count
       from users u
      where ${conditions.join(" and ")}
      -- ⚠️ ستونِ id شکنندهٔ تساوی است: دو دبیرِ هم‌نام (یا هر دو
      -- بی‌نام) وگرنه بینِ دو صفحه جابه‌جا می‌شوند.
      order by u.full_name is null, u.full_name, u.id
      limit ? offset ?`,
    values,
  );

  if (rows.length === 0) return { teachers: [], total: 0 };

  const ids = rows.map((r) => r.id);
  const schoolRows = await query<{ teacher_id: string; name: string }>(
    `select ts.teacher_id, s.name
       from teacher_schools ts
       join schools s on s.id = ts.school_id
      where ts.teacher_id in (${placeholders(ids.length)})
      order by s.name`,
    ids,
  );

  const schoolsByTeacher = new Map<string, string[]>();
  for (const row of schoolRows) {
    const list = schoolsByTeacher.get(row.teacher_id);
    if (list) list.push(row.name);
    else schoolsByTeacher.set(row.teacher_id, [row.name]);
  }

  return {
    total: Number(rows[0]?.total_count ?? 0),
    teachers: rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      approvedAt: r.approved_at,
      classCount: Number(r.class_count),
      studentCount: Number(r.student_count),
      hasTeacherPlus: Number(r.plus_active) > 0,
      schools: schoolsByTeacher.get(r.id) ?? [],
    })),
  };
}

/* ═══════════════════ کلاس‌های یک دبیر — فقط خواندنی ════════════════════ */

export type TeacherSupportClassRow = {
  id: string;
  name: string;
  grade: Grade;
  schoolName: string;
  isActive: boolean;
  joinEnabled: boolean;
  memberCount: number;
  createdAt: string;
};

export type TeacherSupportView = {
  teacher: { id: string; fullName: string | null; email: string | null };
  classes: TeacherSupportClassRow[];
};

/**
 * کلاس‌های یک دبیر — همان چیزی که برای جوابِ «کلاسم مشکل دارد» لازم است.
 *
 * ⚠️ `join_code` در این select **نیست** و نباید باشد.
 *
 * برای عیب‌یابی، آنچه مدیر لازم دارد این است که *بداند* عضوگیری باز است یا
 * نه — و `joinEnabled` همان را می‌گوید. خودِ کد هیچ سؤالی را جواب نمی‌دهد
 * که این نمی‌دهد، ولی اگر در پنل باشد، در اسکرین‌شاتِ تیکت و در تاریخچهٔ
 * مرورگر هم هست. دبیر کدش را در پنلِ خودش می‌بیند.
 *
 * ⚠️ و هیچ چیزی از دانش‌آموزان جز **شمارش**: نه نام، نه پاسخ، نه عملکرد.
 * مدیر برای «چند نفر عضوند؟» به فهرستِ اسم‌ها نیاز ندارد.
 *
 * یک کوئری، هر تعداد کلاس.
 */
export async function getTeacherSupportView(
  teacherId: string,
): Promise<TeacherSupportView | null> {
  /* ⚠️ بدونِ شرطِ نقش: مدیر باید بتواند کلاس‌های یک دبیرِ **لغوشده** را هم
     ببیند — دقیقاً وقتی یک تیکت دربارهٔ همان لغو باز می‌شود. */
  const teacher = await queryOne<{ id: string; full_name: string | null; email: string | null }>(
    "select id, full_name, email from users where id = ?",
    [teacherId],
  );
  if (!teacher) return null;

  const rows = await query<{
    id: string;
    name: string;
    grade: Grade;
    school_name: string;
    is_active: boolean;
    join_enabled: boolean;
    member_count: number;
    created_at: string;
  }>(
    `select c.id, c.name, c.grade, s.name as school_name,
            c.is_active, c.join_enabled, c.created_at,
            (select count(*) from class_members m
              where m.class_id = c.id and m.status = 'active') as member_count
       from teacher_classes c
       join schools s on s.id = c.school_id
      where c.teacher_id = ?
      -- کلاسِ باز اول، بعد تازه‌ترین؛ و ستونِ id شکنندهٔ تساوی تا ترتیب بینِ دو
      -- خواندن ثابت بماند.
      -- ⚠️ سقفِ ۲۰۰ یک کرانِ ایمنی است و نه صفحه‌بندی: پرکارترین دبیرِ
      -- واقعی چند ده کلاس دارد. اگر روزی کسی به این سقف خورد، خودش یک
      -- نشانه است و نه یک قابلیتِ کم — آن وقت جایش صفحه‌بندیِ واقعی است.
      order by c.is_active desc, c.created_at desc, c.id
      limit 200`,
    [teacherId],
  );

  return {
    teacher: { id: teacher.id, fullName: teacher.full_name, email: teacher.email },
    classes: rows.map((r) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      schoolName: r.school_name,
      isActive: r.is_active,
      joinEnabled: r.join_enabled,
      memberCount: Number(r.member_count),
      createdAt: r.created_at,
    })),
  };
}
