import "server-only";
import { randomUUID } from "node:crypto";
import { execute, queryOne, isUniqueViolation } from "@/lib/db";
import { logger } from "@/lib/observability";
import { locationLabel } from "@/lib/geo";
import { maskNationalId } from "@/lib/profile/national-id";
import { maskPhone } from "@/lib/auth/phone";
import { removeTeacherDocument } from "./documents";
import { listMyVerificationHistory, recordVerification } from "./verification-log";
import type { AuthUser } from "@/lib/auth/types";
import type {
  TeacherAccountState,
  TeacherRequestReadiness,
  TeacherRequestStatus,
  TeacherRequestView,
} from "./types";

/**
 * درخواستِ فعال‌سازیِ حسابِ دبیر — سمتِ کاربر.
 *
 * ⚠️ این فایل هیچ‌جا `users.role` را نمی‌نویسد و نباید بنویسد. تنها نویسندهٔ
 * آن ستون `lib/admin/teacher-actions.ts` است، پشتِ `requireAdmin()`. جدا
 * بودنشان همان بند ۹ است: «فعال شدن teacher فقط از سمت سرور انجام شود».
 *
 * چیزی که اینجا نوشته می‌شود یک ردیفِ `pending` است و بس.
 */

type RequestRow = {
  id: string;
  status: TeacherRequestStatus;
  national_id: string;
  phone: string;
  province_id: string;
  city_id: string;
  school: string;
  document_name: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const REQUEST_COLUMNS = `id, status, national_id, phone, province_id, city_id, school,
       document_name, rejection_reason, created_at, reviewed_at`;

function toView(row: RequestRow): TeacherRequestView {
  return {
    id: row.id,
    status: row.status,
    nationalIdMasked: maskNationalId(row.national_id),
    phoneMasked: maskPhone(row.phone),
    provinceId: row.province_id,
    cityId: row.city_id,
    locationLabel: locationLabel(row.province_id, row.city_id),
    school: row.school,
    documentName: row.document_name,
    // ⚠️ یادداشتِ بررسی فقط در دو وضعیتی برگردانده می‌شود که واقعاً معنی
    // دارد. اگر کاربر اصلاحیه فرستاد و پرونده به `pending` برگشت، دیدنِ
    // یادداشتِ قبلی کنارِ «در انتظار بررسی» فقط گیج‌کننده است — کاربر فکر
    // می‌کند باز هم ایراد دارد.
    reviewNote:
      row.status === "rejected" || row.status === "needs_revision"
        ? row.rejection_reason
        : null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/* ─────────────────────────── خواندنِ وضعیت ─────────────────────────────── */

/**
 * تازه‌ترین درخواستِ این کاربر.
 *
 * ⚠️ «تازه‌ترین» و نه «در انتظار»: بعد از یک رد، همان ردیف تنها چیزی است که
 * دلیلِ رد را دارد و کاربر باید ببیندش (بند ۶).
 */
export async function getLatestTeacherRequest(userId: string): Promise<TeacherRequestView | null> {
  const row = await queryOne<RequestRow>(
    `select ${REQUEST_COLUMNS}
       from teacher_requests
      where user_id = ?
      order by created_at desc
      limit 1`,
    [userId],
  );
  return row ? toView(row) : null;
}

/**
 * وضعیتِ «حساب دبیر» برای کارتِ پنل — بند ۶.
 *
 * ⚠️ نقشِ واقعیِ کاربر بر ردیفِ درخواست مقدم است. سناریوی واقعی‌اش این است
 * که مدیر مستقیم از «مدیریت کاربران» نقشِ کسی را `teacher` کرده، بدونِ
 * اینکه درخواستی در کار باشد. اگر اول به جدولِ درخواست نگاه می‌کردیم، آن
 * دبیر برای همیشه پیامِ «هنوز درخواستی نفرستاده‌ای» می‌دید.
 */
export async function getTeacherAccountState(user: AuthUser): Promise<TeacherAccountState> {
  const request = await getLatestTeacherRequest(user.id);

  if (user.role === "teacher") return { state: "teacher", request };

  if (!request) return { state: "none" };
  if (request.status === "pending") return { state: "pending", request };
  if (request.status === "rejected") return { state: "rejected", request };
  if (request.status === "needs_revision") return { state: "needs_revision", request };

  // ⚠️ `approved` ولی نقش هنوز `teacher` نیست — یعنی یا مدیر بعداً نقش را
  // برگردانده، یا (بعیدتر) تأیید نیمه‌کاره مانده. در هر دو حالت «تأییدشده»
  // نوشتنِ کارت دروغ است، چون کاربر هیچ‌کدام از قابلیت‌ها را ندارد. بهترین
  // پاسخ همان «می‌توانی درخواست بدهی» است.
  return { state: "none" };
}

/**
 * آیا کاربر پیش‌شرط‌های فرم را دارد؟
 *
 * ⚠️ فقط برای نمایش. سرور همین‌ها را در `submitTeacherRequest` دوباره
 * می‌سنجد — این یکی برای این است که کاربر *قبل* از پر کردنِ فرم و آپلودِ
 * فایل بفهمد چه چیزی کم دارد، نه بعدش.
 */
export function teacherRequestReadiness(user: AuthUser): TeacherRequestReadiness {
  return {
    profileCompleted: user.profileCompleted && !!user.firstName && !!user.lastName,
    phoneVerified: user.phoneVerified && !!user.phone,
    phoneMasked: maskPhone(user.phone),
  };
}

/* ──────────────────────────── ثبتِ درخواست ────────────────────────────── */

export type SubmitResult =
  | { ok: true; request: TeacherRequestView }
  | { ok: false; error: string };

export type SubmitParams = {
  user: AuthUser;
  nationalId: string;
  provinceId: string;
  cityId: string;
  school: string;
  document: { key: string; name: string; contentType: string; size: number };
};

/**
 * ثبتِ یک درخواستِ تازه.
 *
 * ترتیبِ بررسی‌ها عمدی است و از ارزان به گران می‌رود، ولی مهم‌تر از آن:
 * **همه‌شان اینجا هستند و نه در route**. یک route دیگر که فردا نوشته شود
 * (مثلاً برای اپ موبایل) اگر این تابع را صدا بزند، هیچ‌کدام را جا نمی‌اندازد.
 */
export async function submitTeacherRequest(params: SubmitParams): Promise<SubmitResult> {
  const { user, nationalId, provinceId, cityId, school, document } = params;

  // ⚠️ کسی که از قبل دبیر یا مدیر است، درخواست نمی‌دهد. بی‌ضرر به‌نظر
  // می‌رسد ولی نیست: تأییدِ یک درخواستِ تازه برای یک *مدیر*، نقشش را به
  // `teacher` تغییر می‌داد و دسترسیِ مدیریتش را می‌گرفت.
  if (user.role === "teacher") {
    return { ok: false, error: "حساب شما از قبل به‌عنوان دبیر فعال است." };
  }
  if (user.role === "admin") {
    return { ok: false, error: "حساب مدیر نیازی به فعال‌سازی دبیری ندارد." };
  }

  // بند ۳: انتخابِ «دبیر» در پروفایل، مقدمهٔ این فرم است.
  if (user.desiredRole !== "teacher") {
    return {
      ok: false,
      error: "اول در «تکمیل پروفایل» نقش «دبیر» را انتخاب کنید.",
    };
  }

  if (!user.firstName || !user.lastName) {
    return { ok: false, error: "اول نام و نام خانوادگی‌تان را در پروفایل کامل کنید." };
  }

  /* ⚠️ بند ۵ — شمارهٔ موبایلِ **تأییدشده**، و از ردیفِ خودِ کاربر.
     شماره از بدنهٔ درخواست خوانده نمی‌شود؛ اگر می‌شد، هر کسی می‌توانست
     درخواستی با شمارهٔ شخصِ دیگری ثبت کند و مدیر هنگام بررسی به همان
     شماره زنگ می‌زد. */
  if (!user.phoneVerified || !user.phone) {
    return {
      ok: false,
      error: "برای ارسال درخواست، اول شمارهٔ موبایلتان را تأیید کنید.",
    };
  }

  /* ── اصلاحیه، یا درخواستِ تازه؟ ─────────────────────────────────────────
     ⚠️ اگر پرونده‌ای در وضعیت `needs_revision` باز باشد، **همان ردیف**
     به‌روز می‌شود و ردیفِ دوم ساخته نمی‌شود.

     دو دلیل، و دومی مهم‌تر است:
       • ایندکسِ `teacher_requests_one_pending_key` از مهاجرت ۰۱۰ به بعد
         `needs_revision` را هم «باز» می‌شمارد، پس یک insert اینجا با خطای
         یکتایی می‌خورد.
       • تاریخچهٔ پرونده باید پیوسته بماند: «ثبت شد → نیاز به اصلاح →
         دوباره فرستاده شد → تأیید». با ردیفِ تازه، آن زنجیره دو تکه می‌شد
         و ادمین نمی‌فهمید این همان پرونده است. */
  const open = await queryOne<{ id: string; document_key: string; status: TeacherRequestStatus }>(
    `select id, document_key, status
       from teacher_requests
      where user_id = ? and status in ('pending', 'needs_revision')
      limit 1`,
    [user.id],
  );

  if (open?.status === "pending") {
    return {
      ok: false,
      error: "شما یک درخواستِ در انتظار بررسی دارید. تا تعیین تکلیف آن، درخواست تازه‌ای ثبت نمی‌شود.",
    };
  }

  if (open) return resubmit(user, open, params);

  const id = randomUUID();

  try {
    await execute(
      `insert into teacher_requests
         (id, user_id, national_id, phone, province_id, city_id, school,
          document_key, document_name, document_type, document_size, status)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        user.id,
        nationalId,
        user.phone,
        provinceId,
        cityId,
        school,
        document.key,
        // نامِ فایل تا سقفِ ستون بریده می‌شود. یک نامِ ۴۰۰ نویسه‌ای در حالت
        // غیر-strict بی‌صدا بریده می‌شد و در حالت strict کلِ درخواست را
        // می‌شکست؛ هیچ‌کدام رفتارِ درستی برای «نامِ فایل بلند بود» نیست.
        document.name.slice(0, 160),
        document.contentType.slice(0, 40),
        document.size,
      ],
    );
  } catch (err) {
    /* ⚠️ نقضِ یکتایی اینجا یک *معنا* دارد و نه یک خرابی: ایندکسِ
       `teacher_requests_one_pending_key` می‌گوید این کاربر از قبل یک
       پروندهٔ باز دارد.

       بالاتر صریح بررسی شد، ولی بینِ آن `select` و این `insert` یک پنجرهٔ
       مسابقه است — دو تبِ باز که هم‌زمان ارسال بزنند. این شاخه همان را
       می‌گیرد و پیامش آرام است، نه یک خطای ۵۰۰. */
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error: "شما یک درخواستِ در انتظار بررسی دارید. تا تعیین تکلیف آن، درخواست تازه‌ای ثبت نمی‌شود.",
      };
    }
    throw err;
  }

  await recordVerification(null, {
    requestId: id,
    teacherId: user.id,
    adminId: null,
    action: "submitted",
  });

  logger.info("درخواست فعال‌سازی دبیر ثبت شد", {
    event: "teacher.request.submitted",
    // ⚠️ نه کد ملی، نه شماره، نه نامِ فایل.
    user_id: user.id,
    teacher_request_id: id,
  });

  const created = await getLatestTeacherRequest(user.id);
  if (!created) throw new Error("درخواست ثبت شد ولی خوانده نشد.");
  return { ok: true, request: created };
}

/**
 * ارسالِ دوبارهٔ مدارک روی یک پروندهٔ `needs_revision`.
 *
 * ⚠️ شرطِ `status = 'needs_revision'` داخلِ خودِ `UPDATE` است و نه در یک
 * `if` جداگانه.
 *
 * بررسیِ بالادست هست، ولی بینِ آن و اینجا ادمین می‌تواند همان پرونده را رد
 * یا تأیید کرده باشد. اگر شرط در SQL نبود، یک اصلاحیهٔ دیررس می‌توانست
 * پرونده‌ای را که **تأیید شده** به `pending` برگرداند — یعنی دبیری که
 * نقش و اشتراکش را گرفته، ناگهان دوباره در صفِ بررسی بنشیند.
 */
async function resubmit(
  user: AuthUser,
  open: { id: string; document_key: string },
  params: SubmitParams,
): Promise<SubmitResult> {
  const { nationalId, provinceId, cityId, school, document } = params;

  const affected = await execute(
    `update teacher_requests
        set national_id = ?, phone = ?, province_id = ?, city_id = ?, school = ?,
            document_key = ?, document_name = ?, document_type = ?, document_size = ?,
            status = 'pending',
            -- ⚠️ یادداشتِ قبلی پاک می‌شود: کاربر اصلاحش کرده و نگه داشتنش
            -- یعنی ادمینِ بعدی ایرادی را می‌بیند که دیگر وجود ندارد.
            rejection_reason = null,
            reviewed_by = null,
            reviewed_at = null
      where id = ? and user_id = ? and status = 'needs_revision'`,
    [
      nationalId,
      user.phone,
      provinceId,
      cityId,
      school,
      document.key,
      document.name.slice(0, 160),
      document.contentType.slice(0, 40),
      document.size,
      open.id,
      user.id,
    ],
  );

  if (affected === 0) {
    return {
      ok: false,
      error: "وضعیت درخواست شما تغییر کرده است. صفحه را تازه کنید.",
    };
  }

  await recordVerification(null, {
    requestId: open.id,
    teacherId: user.id,
    adminId: null,
    action: "resubmitted",
  });

  /* ⚠️ مدرکِ قبلی *بعد* از موفقیتِ UPDATE حذف می‌شود و نه قبلش.
     ترتیبِ برعکس یعنی اگر UPDATE شکست بخورد، پرونده به فایلی اشاره می‌کند
     که دیگر روی دیسک نیست — و ادمین هیچ مدرکی برای بررسی ندارد. این ترتیب
     بدترین حالتش یک فایلِ یتیم است. */
  if (open.document_key && open.document_key !== document.key) {
    await removeTeacherDocument(open.document_key);
  }

  logger.info("مدارک درخواست دبیری دوباره فرستاده شد", {
    event: "teacher.request.resubmitted",
    user_id: user.id,
    teacher_request_id: open.id,
  });

  const updated = await getLatestTeacherRequest(user.id);
  if (!updated) throw new Error("درخواست به‌روز شد ولی خوانده نشد.");
  return { ok: true, request: updated };
}

/** تاریخچهٔ درخواست‌های خودِ کاربر — برای نمایش در پنل. */
export async function getVerificationHistory(userId: string) {
  return listMyVerificationHistory(userId);
}
