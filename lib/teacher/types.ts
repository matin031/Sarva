/**
 * نوع‌های «دبیر شدن» و کلاس‌ها — مشترکِ سرور و کلاینت.
 *
 * ⚠️ عمداً بدون `"server-only"`: کامپوننت‌های کلاینتِ پنل (فرمِ درخواست،
 * کارتِ وضعیت، فهرستِ کلاس‌ها) باید بتوانند همین شکل‌ها را تایپ کنند.
 *
 * ⚠️ و به همین دلیل، هیچ‌کدام از این نوع‌ها کد ملیِ کامل ندارند. آن یکی فقط
 * در `AdminTeacherRequest` است که پشتِ `requireAdmin()` خوانده می‌شود و
 * هرگز به یک کامپوننتِ کلاینتِ عمومی نمی‌رسد.
 */

import type { Grade } from "@/lib/profile/schemas";
import type { MembershipStatus } from "./membership";

/**
 * ⚠️ `needs_revision` نه تأیید است و نه رد — یک حالتِ *باز* است.
 *
 * پرونده باز می‌ماند، کاربر فقط مدرکش را عوض می‌کند، و همان ردیف به
 * `pending` برمی‌گردد. بدونِ آن، «تصویرِ حکم خوانا نیست» چاره‌ای جز رد کردن
 * نداشت — و ردّ کردن یعنی کاربر باید از صفر شروع کند.
 *
 * ⚠️ و هیچ دسترسی‌ای نمی‌دهد: نه نقش عوض می‌شود و نه اشتراکی روشن. تنها
 * گذارِ دسترسی‌دهنده `pending → approved` است.
 */
export type TeacherRequestStatus = "pending" | "approved" | "rejected" | "needs_revision";

/** وضعیت‌هایی که یعنی «پرونده هنوز باز است».
 *
 *  ⚠️ همین دو مقدار در تریگرِ `pending_user_id` (مهاجرت ۰۱۰) هم نوشته شده‌اند.
 *  اگر یکی عوض شود و دیگری نه، یا کاربر دو پروندهٔ باز می‌سازد یا اصلاً
 *  نمی‌تواند اصلاحیه بفرستد. */
export const OPEN_TEACHER_STATUSES: readonly TeacherRequestStatus[] = [
  "pending",
  "needs_revision",
];

/** برچسبِ فارسیِ هر وضعیت — بند ۶. */
export const TEACHER_STATUS_LABEL: Record<TeacherRequestStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  needs_revision: "نیاز به اصلاح مدارک",
};

/**
 * درخواست، آن‌طور که **خودِ کاربر** می‌بیند.
 *
 * ⚠️ `nationalId` اینجا پوشیده است (`00••••••78`) و نه کامل. کاربر خودش
 * فرستاده‌اش و می‌داند چیست؛ نمایشِ کاملش فقط یعنی یک دادهٔ هویتی روی صفحه‌ای
 * که ممکن است در کلاس یا سرِ کار باز باشد.
 */
export type TeacherRequestView = {
  id: string;
  status: TeacherRequestStatus;
  nationalIdMasked: string | null;
  phoneMasked: string | null;
  provinceId: string;
  cityId: string;
  /** «تهران / شهریار» — از `lib/geo` ساخته می‌شود. */
  locationLabel: string | null;
  school: string;
  documentName: string;
  /**
   * یادداشتِ بررسی‌کننده — دلیلِ رد، یا «چه چیزی را اصلاح کن».
   *
   * ⚠️ ستونِ دیتابیس هنوز `rejection_reason` نام دارد و عمداً عوض نشده:
   * تغییرِ نامِ ستون روی جدولی که ممکن است مستقر شده باشد، ریسکی است که
   * هیچ سودی ندارد. اسمِ اینجا معنای واقعی‌اش را می‌گوید.
   *
   * فقط برای `rejected` و `needs_revision` پر می‌شود.
   */
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/** یک ردیف از تاریخچهٔ پرونده — بند ۳. */
export type TeacherVerificationLogEntry = {
  id: string;
  action: "submitted" | "resubmitted" | "approved" | "rejected" | "needs_revision";
  description: string | null;
  /** نامِ ادمین، یا null وقتی خودِ کاربر اقدام کرده. */
  actorName: string | null;
  createdAt: string;
};

/** برچسبِ فارسیِ هر رویدادِ تاریخچه. */
export const TEACHER_LOG_ACTION_LABEL: Record<
  TeacherVerificationLogEntry["action"],
  string
> = {
  submitted: "درخواست ثبت شد",
  resubmitted: "مدارک دوباره فرستاده شد",
  approved: "تأیید شد",
  rejected: "رد شد",
  needs_revision: "نیاز به اصلاح اعلام شد",
};

/**
 * وضعیتِ کلیِ «حساب دبیر» برای کارتِ پنل.
 *
 * ⚠️ چهار حالت و نه سه: «هنوز درخواستی نفرستاده» با «رد شده» یکی نیست، حتی
 * با اینکه در هر دو حالت دکمهٔ «ارسال درخواست» دیده می‌شود. کاربری که رد
 * شده باید دلیلش را ببیند، وگرنه همان فایل را دوباره می‌فرستد و دوباره رد
 * می‌شود.
 */
export type TeacherAccountState =
  /** نقشِ کاربر از قبل `teacher` است — تأیید شده و کار تمام است. */
  | { state: "teacher"; request: TeacherRequestView | null }
  | { state: "none" }
  | { state: "pending"; request: TeacherRequestView }
  | { state: "rejected"; request: TeacherRequestView }
  /**
   * ⚠️ جدا از `rejected` و نه یکی با آن، با اینکه هر دو فرمِ ارسال را نشان
   * می‌دهند. تفاوتشان در پیام است: «رد شد، اگر خواستی دوباره تلاش کن» در
   * برابر «فقط این یک چیز را درست کن» — و دومی کاربری را نگه می‌دارد که
   * اولی از سایت بیرونش می‌کرد.
   */
  | { state: "needs_revision"; request: TeacherRequestView };

/**
 * ⚠️ چیزهایی که کاربر باید *قبل از* فرمِ درخواست درست کرده باشد.
 *
 * این شیء وجود دارد تا فرم بتواند بگوید «اول شماره‌ات را تأیید کن» به‌جای
 * اینکه کاربر فرم را پر کند، فایل آپلود کند و بعد یک خطای ۴۰۰ بگیرد. سرور
 * همین شرط‌ها را دوباره می‌سنجد — این یکی برای تجربهٔ کاربری است، آن یکی
 * دروازه.
 */
export type TeacherRequestReadiness = {
  profileCompleted: boolean;
  phoneVerified: boolean;
  /** شمارهٔ تأییدشده، پوشیده — برای نشان دادن در فرم. */
  phoneMasked: string | null;
};

/* ────────────────────────────── مدیریت ───────────────────────────────── */

/**
 * درخواست، آن‌طور که **مدیر** می‌بیند — بند ۷.
 *
 * ⚠️ `nationalId` کامل است و `documentHref` به مسیری اشاره می‌کند که پشتِ
 * `requireAdmin()` است. هیچ‌کدام نباید در یک نوعِ مشترک با کلاینتِ عمومی
 * بنشینند؛ همین که این نوع فقط در `lib/admin/teacher-actions.ts` و
 * `components/admin/*` استفاده می‌شود، خودش بخشی از دفاع است.
 */
export type AdminTeacherRequest = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
  nationalId: string;
  provinceId: string;
  cityId: string;
  locationLabel: string | null;
  school: string;
  documentName: string;
  documentType: string;
  documentSize: number;
  /** مسیرِ سروِ فقط-مدیر. هرگز یک نشانیِ مستقیمِ دیسک یا `/uploads`. */
  documentHref: string;
  status: TeacherRequestStatus;
  /** یادداشتِ بررسی — دلیلِ رد یا توضیحِ اصلاح. ستونِ دیتابیس هنوز
   *  `rejection_reason` است؛ توضیحش کنارِ `TeacherRequestView.reviewNote`. */
  reviewNote: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  /** نقشِ فعلیِ کاربر — تا مدیر ببیند تأیید قبلاً اثر کرده یا نه. */
  userRole: "student" | "teacher" | "admin";
};

/* ─────────────────────────── مدرسه و کلاس ─────────────────────────────── */

export type School = {
  id: string;
  name: string;
  provinceId: string;
  cityId: string;
  locationLabel: string | null;
};

export type TeacherClass = {
  id: string;
  name: string;
  grade: Grade;
  schoolId: string;
  schoolName: string;
  /** ⚠️ فقط برای خودِ دبیر. هر کسی که این کد را داشته باشد وارد کلاس می‌شود. */
  joinCode: string;
  /** کلاس بایگانی نشده؟ — وضعیتِ خودِ کلاس. */
  isActive: boolean;
  /**
   * عضوگیری باز است؟
   *
   * ⚠️ از `isActive` جداست و مهاجرت ۰۱۴ همین را جدا کرد: «کلاس بسته است»
   * و «فعلاً عضو نمی‌پذیرم» دو کارِ متفاوت‌اند و تا آن migration یک ستون
   * بودند.
   */
  joinEnabled: boolean;
  memberCount: number;
  createdAt: string;
};

/** کلاسی که یک دانش‌آموز عضوش است — بدونِ `joinCode`. */
export type StudentClass = {
  id: string;
  name: string;
  grade: Grade;
  schoolName: string;
  teacherName: string | null;
  isActive: boolean;
  joinedAt: string;
  /**
   * ⚠️ فقط `active` و `blocked` به این فهرست می‌رسند.
   *
   * `removed` (خروجِ خودخواسته) عمداً نمی‌آید: دانش‌آموز خودش رفته و نشان
   * دادنِ کلاسی که ترکش کرده فقط شلوغی است. ولی `blocked` می‌آید — کسی که
   * دبیر بیرونش گذاشته باید بفهمد چه شده، نه اینکه کلاس بی‌توضیح ناپدید
   * شود و او با کد دوباره امتحان کند.
   */
  status: "active" | "blocked";
  /**
   * آیا دبیرِ این کلاس هنوز دبیر است؟
   *
   * ⚠️ چرا یک فیلدِ صریح و نه `teacherName !== null`: آن دو هیچ ربطی به هم
   * ندارند — دبیری که نامش را پر نکرده هنوز دبیر است، و دبیری که دسترسی‌اش
   * لغو شده هنوز نام دارد. حدس زدنِ یکی از روی دیگری یعنی نمایشِ غلط در هر
   * دو جهت.
   *
   * ⚠️ و هرگز *دلیلِ* لغو. دانش‌آموز فقط باید بداند کلاسش بی‌ناظر است؛ اینکه
   * چرا، بینِ مدیر و آن دبیر است و در `admin_audit_log` می‌ماند.
   */
  teacherActive: boolean;
};

export type ClassMember = {
  studentId: string;
  fullName: string | null;
  grade: Grade | null;
  joinedAt: string;
  /** شرحِ هر وضعیت در `lib/teacher/membership.ts`. */
  status: MembershipStatus;
};
