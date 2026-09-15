"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { enumArg, optionalTextArg, uuidArg } from "@/lib/api/action-input";
import { adminWriteGate } from "@/lib/admin/teacher-limits";
import { recordAudit } from "@/lib/admin/audit";
import { notify } from "@/lib/plus/notifications";
import { locationLabel } from "@/lib/geo";
import { logger } from "@/lib/observability";
import { listRequestHistory, recordVerification } from "@/lib/teacher/verification-log";
import { approveTeacherRequest, revokeTeacher } from "@/lib/teacher/review";
import {
  OPEN_TEACHER_STATUSES,
  type AdminTeacherRequest,
  type TeacherRequestStatus,
  type TeacherVerificationLogEntry,
} from "@/lib/teacher/types";

/**
 * «آیا این پرونده هنوز باز است؟»
 *
 * ⚠️ تنها جایی که این سؤال پاسخ داده می‌شود. تا دیروز شرط `status !==
 * "pending"` در دو تابع تکرار شده بود؛ با آمدنِ `needs_revision` هر دو باید
 * عوض می‌شدند و جا انداختنِ یکی یعنی ادمین نمی‌تواند پرونده‌ای را که خودش
 * برای اصلاح فرستاده، تعیین تکلیف کند.
 */
function isOpen(status: TeacherRequestStatus): boolean {
  return OPEN_TEACHER_STATUSES.includes(status);
}

/**
 * مدیریتِ درخواست‌های دبیری — بندهای ۷ و ۸.
 *
 * =============================================================================
 * ⚠️ این فایل **تنها** جایی است که `users.role` مقدارِ `teacher` می‌گیرد
 * =============================================================================
 *
 * بند ۹ می‌گوید «کاربر نباید بتواند خودش role را تغییر دهد» و «فعال شدن
 * teacher فقط از سمت سرور انجام شود». تنها راهی که این جمله واقعاً تضمین
 * شود، این است که *یک* نقطه بنویسدش و آن نقطه پشتِ `requireAdmin()` باشد.
 *
 * (`adminSetUserRole` در `user-actions.ts` هم نقش می‌نویسد، ولی آن هم پشتِ
 * همان گارد است و عمداً `teacher` را نمی‌پذیرد — چون تغییرِ نقش از آنجا
 * اشتراکِ دبیری را روشن نمی‌کند و یک دبیرِ نیمه‌فعال می‌ساخت.)
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const PAGE_SIZE = 25;

type Row = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  user_role: "student" | "teacher" | "admin";
  phone: string;
  national_id: string;
  province_id: string;
  city_id: string;
  school: string;
  document_name: string;
  document_type: string;
  document_size: number;
  status: TeacherRequestStatus;
  rejection_reason: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function toAdminView(row: Row): AdminTeacherRequest {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    nationalId: row.national_id,
    provinceId: row.province_id,
    cityId: row.city_id,
    locationLabel: locationLabel(row.province_id, row.city_id),
    school: row.school,
    documentName: row.document_name,
    documentType: row.document_type,
    documentSize: row.document_size,
    /* ⚠️ مسیرِ سروِ فقط-مدیر و نه نشانیِ فایل.
       `document_key` عمداً هرگز از سرور بیرون نمی‌رود: اگر می‌رفت، اولین
       کسی که آن را جایی کپی می‌کرد، امیدش به «کسی نمی‌داند» بود. توضیحِ
       کامل بالای `lib/teacher/documents.ts`. */
    documentHref: `/api/v1/admin/teacher-requests/${row.id}/document`,
    status: row.status,
    reviewNote: row.rejection_reason,
    reviewerName: row.reviewer_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    userRole: row.user_role,
  };
}

/* ⚠️ یک رشته و نه تکرارِ دستی در دو کوئری — همان درسی که `AUTH_USER_COLUMNS`
   داد: فهرستی که در دو جا نوشته شود، دیر یا زود در یکی‌شان از قلم می‌افتد. */
const SELECT_REQUEST = `
  select r.id, r.user_id, u.first_name, u.last_name, u.email, u.role as user_role,
         r.phone, r.national_id, r.province_id, r.city_id, r.school,
         r.document_name, r.document_type, r.document_size,
         r.status, r.rejection_reason, r.reviewed_at, r.created_at,
         rv.full_name as reviewer_name
    from teacher_requests r
    join users u on u.id = r.user_id
    left join users rv on rv.id = r.reviewed_by`;

/* ─────────────────────────────── خواندن ───────────────────────────────── */

export async function adminListTeacherRequests(
  params: { status?: TeacherRequestStatus | "all"; search?: string; limit?: number; offset?: number } = {},
): Promise<{ requests: AdminTeacherRequest[]; total: number; pendingCount: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.status && params.status !== "all") {
    values.push(
      enumArg(
        params.status,
        ["pending", "approved", "rejected", "needs_revision"],
        "وضعیت نامعتبر است.",
      ),
    );
    conditions.push("r.status = ?");
  }

  const search = params.search?.trim();
  if (search) {
    // ⚠️ در MySQL هر `?` پارامترِ بعدی را مصرف می‌کند، پس الگو باید به تعدادِ
    // `?` ها فرستاده شود — درسِ همان کامنتِ `adminListUsers`.
    //
    // ⚠️ کد ملی عمداً در جست‌وجو هست: مدیری که یک حکم را بررسی می‌کند، کد
    // روی خودِ سند است و طبیعی‌ترین چیزی است که تایپ می‌کند.
    const pattern = `%${search.toLowerCase()}%`;
    values.push(pattern, pattern, pattern, pattern);
    conditions.push(
      "(lower(u.email) like ? or lower(u.full_name) like ? or r.national_id like ? or lower(r.school) like ?)",
    );
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? PAGE_SIZE, 1), 100);
  values.push(limit, Math.max(params.offset ?? 0, 0));

  const rows = await query<Row & { total_count: number }>(
    `${SELECT_REQUEST}
     ${where}
     -- ⚠️ در-انتظارها اول، بعد تازه‌ترین. این صفِ کارِ مدیر است و نه یک
     -- آرشیو: درخواستی که منتظرِ تصمیم است نباید زیرِ صد ردیفِ تأییدشده
     -- گم شود.
     order by (r.status = 'pending') desc, r.created_at desc, r.id
     limit ? offset ?`,
    values,
  );

  // شمارِ در-انتظار مستقل از فیلترِ فعلی خوانده می‌شود: نشانِ کنارِ منو باید
  // همیشه بگوید «چند تا منتظرند»، حتی وقتی مدیر دارد آرشیو را می‌بیند.
  const pending = await queryOne<{ n: number }>(
    "select count(*) as n from teacher_requests where status = 'pending'",
  );

  return {
    requests: rows.map(toAdminView),
    total: rows[0]?.total_count ?? 0,
    pendingCount: pending?.n ?? 0,
  };
}

export async function adminGetTeacherRequest(
  requestId: string,
): Promise<{ request: AdminTeacherRequest; history: TeacherVerificationLogEntry[] } | null> {
  await requireAdmin();
  const id = uuidArg(requestId, "شناسهٔ درخواست نامعتبر است.");
  const row = await queryOne<Row>(`${SELECT_REQUEST} where r.id = ?`, [id]);
  if (!row) return null;

  // ⚠️ تاریخچه فقط در نمای *یک* پرونده خوانده می‌شود و نه در فهرست: یک
  // صفحهٔ پنجاه‌ردیفی وگرنه پنجاه کوئریِ اضافه می‌زد برای چیزی که تا روی
  // ردیف کلیک نشود دیده نمی‌شود.
  return { request: toAdminView(row), history: await listRequestHistory(id) };
}

/* ─────────────────────────────── تأیید ────────────────────────────────── */

/**
 * تأییدِ درخواست — بند ۸.
 *
 * سه کار، **در یک تراکنش**:
 *   ۱) وضعیتِ درخواست → `approved`
 *   ۲) نقشِ کاربر     → `teacher`
 *   ۳) اشتراکِ دائمیِ `teacher_verified`
 *
 * ⚠️ چرا یک تراکنش: هر مرزی بینشان یک حالتِ نیمه‌کاره می‌سازد که هیچ‌کدامشان
 * قابلِ تشخیص از بیرون نیست. «دبیر هست ولی پلاس ندارد» یک تیکتِ پشتیبانی
 * است؛ «درخواست تأیید شده ولی نقش عوض نشده» بدتر است، چون مدیر فکر می‌کند
 * کارش را کرده و کاربر می‌بیند هیچ اتفاقی نیفتاده.
 *
 * ⚠️ و `for update` روی ردیفِ درخواست: دو مدیر که هم‌زمان روی «تأیید» بزنند
 * باید پشتِ سرِ هم اجرا شوند، وگرنه هر دو `pending` می‌بینند و دو ردیفِ
 * اشتراک ساخته می‌شود. (`grantTeacherPlus` خودش هم نگهبانِ دوم دارد.)
 */
export async function adminApproveTeacherRequest(requestId: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(requestId, "شناسهٔ درخواست نامعتبر است.");

  const throttled = await adminWriteGate(admin.id, "review");
  if (throttled) return { ok: false, errors: [throttled] };

  /* ⚠️ خودِ تراکنش در `lib/teacher/review.ts` است و نه اینجا.
     دلیلش قابلِ آزمون بودن است: این تابع با `requireAdmin()` شروع می‌شود
     که `cookies()` می‌خواند، پس بیرونِ یک درخواستِ Next اصلاً اجرا
     نمی‌شود — و حساس‌ترین تراکنشِ این قابلیت بدونِ آزمون می‌ماند.
     `scripts/check-teacher.ts` حالا همان تابع را روی دیتابیسِ واقعی صدا
     می‌زند. گارد همین‌جا ماند. */
  const outcome = await approveTeacherRequest(id, admin.id);

  if (outcome.kind === "missing") return { ok: false, errors: ["درخواست پیدا نشد."] };
  if (outcome.kind === "admin_target") {
    return { ok: false, errors: ["این کاربر مدیر است؛ تغییر نقشش به دبیر دسترسی مدیریتش را می‌گیرد."] };
  }
  if (outcome.kind === "settled") {
    return {
      ok: false,
      errors: [
        outcome.status === "approved"
          ? "این درخواست قبلاً تأیید شده است."
          : "این درخواست قبلاً رد شده است. کاربر باید درخواست تازه‌ای ثبت کند.",
      ],
    };
  }

  /* ⚠️ اعلان و لاگ **بیرونِ** تراکنش‌اند و عمداً.
     `notify` هرگز throw نمی‌کند (توضیحش بالای خودش)، ولی اگر داخلِ تراکنش
     بود، کندی‌اش قفلِ ردیفِ کاربر را نگه می‌داشت — و مهم‌تر، هر خطای
     غیرمنتظره‌ای در مسیرِ اعلان می‌توانست تأییدی را برگرداند که از نظر مدیر
     انجام شده. */
  await notify({
    userId: outcome.userId,
    kind: "teacher_approved",
    title: "حساب دبیری‌ات تأیید شد",
    body: "پنل دبیر برایت باز شد و سروا پلاس هم به‌صورت دائمی روشن است.",
    href: "/panel/teacher",
    // ⚠️ بدونِ این، هر تأییدِ دوباره یک اعلانِ تکراری می‌ساخت.
    dedupeKey: `teacher_approved:${outcome.userId}`,
  });

  await recordAudit({
    actor: admin,
    action: "teacher.approve",
    targetType: "teacher_request",
    targetId: id,
    summary: `درخواست دبیریِ ${outcome.fullName ?? outcome.email ?? outcome.userId} تأیید شد`,
    metadata: {
      userId: outcome.userId,
      email: outcome.email,
      plusGranted: outcome.grantCreated,
    },
  });

  logger.info("درخواست دبیری تأیید شد", {
    event: "teacher.request.approved",
    user_id: outcome.userId,
    teacher_request_id: id,
  });

  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}

/* ──────────────────────────────── رد ──────────────────────────────────── */

/**
 * ردِ درخواست، و «نیاز به اصلاح» — دو تصمیم با یک پیاده‌سازی.
 *
 * ⚠️ چرا یکی: تنها تفاوتشان وضعیتِ نهایی، متنِ اعلان و برچسبِ لاگ است. هر
 * چیزِ دیگری — قفلِ ردیف، اجباری بودنِ یادداشت، ثبتِ تاریخچه، بی‌اثر بودن
 * روی نقش — یکسان است. دو نسخهٔ جدا یعنی روزی یکی وصله شود و آن یکی نه.
 *
 * ⚠️ نقشِ کاربر در **هیچ‌کدام** دست نمی‌خورد. رد یعنی «هنوز دبیر نشدی»، نه
 * «دیگر دبیر نیستی»؛ اگر کسی از راهِ دیگری دبیر شده باشد، ردِ یک درخواستِ
 * قدیمی نباید دسترسی‌اش را بگیرد. گرفتنِ نقش کارِ صریحِ «مدیریت کاربران»
 * است.
 *
 * ⚠️ و یادداشت در هر دو **اجباری** است. بدونِ آن کاربر فقط می‌بیند «رد شد»
 * یا «اصلاح کن» و تنها کاری که از دستش برمی‌آید فرستادنِ دوبارهٔ همان
 * مدارک است — که دوباره همان نتیجه را می‌گیرد.
 */
type SettleTarget = "rejected" | "needs_revision";

const SETTLE_COPY: Record<
  SettleTarget,
  { noteLabel: string; auditAction: "teacher.reject" | "teacher.needs_revision"; title: string; body: string; summary: string }
> = {
  rejected: {
    noteLabel: "دلیل رد",
    auditAction: "teacher.reject",
    title: "درخواست دبیری‌ات بررسی شد",
    // ⚠️ خودِ یادداشت در متنِ اعلان تکرار نمی‌شود: اعلان ممکن است روی
    // صفحه‌ای باز شود که کسِ دیگری هم می‌بیند. متن پشتِ یک کلیک است.
    body: "متأسفانه تأیید نشد. دلیلش را در بخش «فعال‌سازی حساب دبیر» ببین.",
    summary: "رد شد",
  },
  needs_revision: {
    noteLabel: "توضیح اصلاح",
    auditAction: "teacher.needs_revision",
    title: "مدارک درخواست دبیری‌ات نیاز به اصلاح دارد",
    body: "پرونده‌ات باز است. توضیح را در بخش «فعال‌سازی حساب دبیر» ببین و مدرک تازه بفرست.",
    summary: "نیاز به اصلاح اعلام شد",
  },
};

async function settleRequest(
  requestId: string,
  note: string,
  target: SettleTarget,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(requestId, "شناسهٔ درخواست نامعتبر است.");
  const copy = SETTLE_COPY[target];
  const text = optionalTextArg(note, 500, `${copy.noteLabel} حداکثر ۵۰۰ نویسه است.`);

  if (!text || text.length < 5) {
    return {
      ok: false,
      errors: [`${copy.noteLabel} را بنویسید (دستِ‌کم ۵ نویسه). کاربر همین متن را می‌بیند.`],
    };
  }

  /* ⚠️ بعد از اعتبارسنجیِ متن و نه پیش از آن: یک تایپِ کوتاه نباید سهمیه را
     بسوزاند. چیزی که شمرده می‌شود، تلاشی است که واقعاً می‌نویسد. */
  const throttled = await adminWriteGate(admin.id, "review");
  if (throttled) return { ok: false, errors: [throttled] };

  const outcome = await transaction(async (tx) => {
    const row = await tx.queryOne<{
      user_id: string;
      status: TeacherRequestStatus;
      email: string | null;
      full_name: string | null;
    }>(
      `select r.user_id, r.status, u.email, u.full_name
         from teacher_requests r
         join users u on u.id = r.user_id
        where r.id = ?
        for update`,
      [id],
    );
    if (!row) return { kind: "missing" as const };
    if (!isOpen(row.status)) return { kind: "settled" as const, status: row.status };

    await tx.execute(
      `update teacher_requests
          set status = ?, rejection_reason = ?,
              reviewed_by = ?, reviewed_at = now(6)
        where id = ?`,
      [target, text, admin.id, id],
    );

    // تاریخچه داخلِ همان تراکنش — همان استدلالِ تأیید.
    await recordVerification(tx, {
      requestId: id,
      teacherId: row.user_id,
      adminId: admin.id,
      action: target,
      description: text,
    });

    return {
      kind: "done" as const,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
    };
  });

  if (outcome.kind === "missing") return { ok: false, errors: ["درخواست پیدا نشد."] };
  if (outcome.kind === "settled") {
    return {
      ok: false,
      errors: [
        outcome.status === "approved"
          ? "این درخواست قبلاً تأیید شده است."
          : "این درخواست قبلاً رد شده است.",
      ],
    };
  }

  await notify({
    userId: outcome.userId,
    kind: target === "rejected" ? "teacher_rejected" : "teacher_needs_revision",
    title: copy.title,
    body: copy.body,
    href: "/panel/teacher",
    /* ⚠️ شناسهٔ درخواست در کلید هست و نه فقط شناسهٔ کاربر.

       و برای «نیاز به اصلاح» زمان هم اضافه می‌شود: یک پرونده می‌تواند
       چند بار رفت‌وبرگشت کند و هر بار باید اعلانِ خودش را بسازد. بدونِ
       آن، دومین درخواستِ اصلاح بی‌صدا بلعیده می‌شد (کلیدِ dedupe برای
       همیشه مصرف می‌شود). */
    dedupeKey:
      target === "rejected"
        ? `teacher_rejected:${id}`
        : `teacher_needs_revision:${id}:${Date.now()}`,
  });

  await recordAudit({
    actor: admin,
    action: copy.auditAction,
    targetType: "teacher_request",
    targetId: id,
    summary: `درخواست دبیریِ ${outcome.fullName ?? outcome.email ?? outcome.userId} ${copy.summary}`,
    metadata: { userId: outcome.userId, email: outcome.email, note: text },
  });

  logger.info("درخواست دبیری تعیین تکلیف شد", {
    event: target === "rejected" ? "teacher.request.rejected" : "teacher.request.needs_revision",
    user_id: outcome.userId,
    teacher_request_id: id,
  });

  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}

/** ردِ درخواست، با دلیل — بند ۶ و ۷. */
export async function adminRejectTeacherRequest(
  requestId: string,
  reason: string,
): Promise<ActionResult<null>> {
  return settleRequest(requestId, reason, "rejected");
}

/**
 * «مدارک را اصلاح کن» — بند ۲.
 *
 * ⚠️ پرونده **باز** می‌ماند و کاربر همان ردیف را به‌روز می‌کند
 * (`resubmit` در `lib/teacher/requests.ts`). این تفاوتِ اصلی‌اش با رد است:
 * رد پرونده را می‌بندد و کاربر باید از صفر شروع کند.
 */
export async function adminRequestTeacherRevision(
  requestId: string,
  note: string,
): Promise<ActionResult<null>> {
  return settleRequest(requestId, note, "needs_revision");
}

/* ═══════════════════════════ لغوِ دسترسی ══════════════════════════════ */

/** سقفِ متنِ دلیل — همان سقفِ ستونِ خلاصهٔ `admin_audit_log`. */
const MAX_REVOKE_REASON = 300;

/**
 * لغوِ دسترسیِ دبیری.
 *
 * =============================================================================
 * ⚠️ چرا این مسیر لازم بود
 * =============================================================================
 *
 * تأیید تا امروز یک درِ یک‌طرفه بود. `adminSetUserRole` فقط `student` و
 * `admin` می‌پذیرد و دکمه‌اش در رابط کاربری برای یک دبیر «ارتقا به مدیر»
 * است — پس هیچ راهی برای پس گرفتنِ دبیری وجود نداشت. نتیجهٔ یک تأییدِ
 * اشتباه، یک اشتراکِ مادام‌العمرِ برگشت‌ناپذیر بود و یک کلاسِ زنده بدونِ
 * ناظر.
 *
 * ⚠️ و چرا `adminSetUserRole` را گسترش ندادم: آن تابع فقط یک ستون را عوض
 * می‌کند. لغوِ دبیری سه نوشتن است که باید با هم انجام شوند. قاطی کردنشان
 * یعنی روزی کسی نقش را عوض کند و اشتراک و کلاس‌ها جا بمانند — دقیقاً
 * همان چیزی که این کار برای رفعش هست.
 *
 * ⚠️ `reason` اجباری است. بدونِ آن، شش ماه بعد ردیفِ audit می‌گوید «لغو
 * شد» و هیچ‌کس نمی‌داند چرا — و اگر کاربر اعتراض کند، هیچ مبنایی برای
 * بازبینی نیست.
 */
export async function adminRevokeTeacher(
  userId: string,
  reason: string,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  const note = typeof reason === "string" ? reason.trim() : "";
  if (note.length < 5) return { ok: false, errors: ["دلیل لغو را بنویسید."] };
  if (note.length > MAX_REVOKE_REASON) {
    return { ok: false, errors: [`دلیل لغو نباید از ${MAX_REVOKE_REASON} نویسه بیشتر باشد.`] };
  }

  /* ⚠️ مدیر نمی‌تواند دسترسیِ دبیریِ **خودش** را لغو کند — و این یک حالتِ
     نظری نیست: نقشِ `admin` اصلاً به `revokeTeacher` نمی‌رسد (آنجا
     `not_teacher` می‌گیرد)، ولی پیامِ صریح بهتر از یک خطای گیج‌کننده است. */
  if (id === admin.id) {
    return { ok: false, errors: ["نمی‌توانید دسترسی حساب خودتان را تغییر دهید."] };
  }

  const throttled = await adminWriteGate(admin.id, "revoke");
  if (throttled) return { ok: false, errors: [throttled] };

  const outcome = await revokeTeacher(id);

  if (outcome.kind === "missing") return { ok: false, errors: ["کاربر پیدا نشد."] };
  if (outcome.kind === "not_teacher") {
    return {
      ok: false,
      errors: [
        outcome.role === "admin"
          ? "این کاربر مدیر است و نقش دبیری ندارد."
          : "این کاربر دبیر نیست.",
      ],
    };
  }

  /* ⚠️ اعلان و audit **بیرونِ** تراکنش — همان ترتیبی که تأیید هم دارد.
     `notify` هرگز throw نمی‌کند، ولی اگر داخل بود، کندی‌اش قفلِ ردیفِ
     کاربر را نگه می‌داشت و هر خطای غیرمنتظره‌ای می‌توانست لغوی را
     برگرداند که از نظر مدیر انجام شده. */
  await notify({
    userId: id,
    kind: "teacher_revoked",
    title: "دسترسی دبیری حساب شما لغو شد",
    /* ⚠️ متنِ دلیل **در اعلان نمی‌آید**.

       دلیل را مدیر برای سابقهٔ داخلی می‌نویسد و ممکن است صریح یا
       قضاوت‌آمیز باشد؛ فرستادنش خام به کاربر، یک یادداشتِ اداری را به یک
       پیامِ شخصی تبدیل می‌کند. کاربری که توضیح بخواهد، از راهِ پشتیبانی
       می‌پرسد و آنجا با زبانِ درست جواب می‌گیرد. */
    body: "پنل دبیر و سروا پلاسِ ناشی از تأیید دبیری دیگر فعال نیست. اگر فکر می‌کنید اشتباهی شده، با پشتیبانی تماس بگیرید.",
    href: "/panel/support",
  });

  await recordAudit({
    actor: admin,
    action: "teacher.revoke",
    targetType: "user",
    targetId: id,
    summary: `دسترسی دبیریِ ${outcome.fullName ?? outcome.email ?? id} لغو شد — ${note}`,
    metadata: {
      reason: note,
      plusRevoked: outcome.plusRevoked,
      classesClosed: outcome.classesClosed,
    },
  });

  /* ⚠️ لاگِ عملیاتی فقط شناسه و شمارش دارد.

     `reason` را مدیر نوشته و می‌تواند نامِ آدم‌ها یا جزئیاتِ یک شکایت را
     داشته باشد؛ جایش `admin_audit_log` است که پشتِ `requireAdmin()`
     خوانده می‌شود، نه stdoutِ کانتینر که هر جمع‌آورندهٔ لاگی می‌بیندش.
     (همان قاعده‌ای که برای `document_key` هم گذاشته شد.) */
  logger.info("دسترسی دبیری لغو شد", {
    event: "teacher.revoked",
    user_id: id,
    plus_revoked: outcome.plusRevoked,
    classes_closed: outcome.classesClosed,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}
