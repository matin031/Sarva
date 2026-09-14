import { z } from "zod";
import { isValidLocation } from "@/lib/geo";
import { isValidNationalId, normalizeNationalId } from "./national-id";

/**
 * قوانینِ پروفایلِ تکمیلی و درخواستِ دبیری — یک نسخه، مشترکِ کلاینت و سرور.
 *
 * ⚠️ عمداً بدون `"server-only"`، به همان دلیلی که `lib/auth/schemas.ts`
 * دارد: اعتبارسنجیِ کلاینت برای تجربهٔ کاربری است و اعتبارسنجیِ سرور دروازه.
 * وقتی هر دو از یک فایل بخوانند، هیچ‌وقت «فرم قبول کرد ولی سرور رد کرد»
 * اتفاق نمی‌افتد — که آزاردهنده‌ترین حالتِ ممکن است، چون کاربر نمی‌فهمد چه
 * چیزی غلط بوده.
 */

/* ────────────────────────────── نام ───────────────────────────────────── */

/**
 * ⚠️ الگوی نام از `AccountSettings.tsx` می‌آید ولی سقفش عوض شده.
 *
 * آنجا «۳ تا ۱۲ حرف» بود، چون یک فیلدِ واحد برای *کلِ* نام بود و ۱۲ نویسه
 * برای یک نامِ کوچک بس است. حالا دو فیلدِ جداست و نام خانوادگی به آن سقف
 * نمی‌خورد: «قره‌باغی نیاسر» هفده نویسه است و یک نامِ کاملاً واقعی.
 *
 * ⚠️ نیم‌فاصله (`‌`) در فهرستِ مجاز است و نبودش یک باگِ واقعی می‌ساخت:
 * «حسین‌زاده» با نیم‌فاصله نوشته می‌شود و بدونِ آن نویسه، پیامِ «نام را به
 * فارسی بنویس» به کسی نشان داده می‌شد که دقیقاً همان کار را کرده بود.
 */
const PERSIAN_NAME = /^[؀-ۿ‌\s]+$/;

export const firstNameField = z
  .string()
  .trim()
  .min(2, "نام باید دستِ‌کم ۲ حرف باشد")
  .max(40, "نام حداکثر ۴۰ حرف است")
  .regex(PERSIAN_NAME, "نام را به فارسی بنویس");

export const lastNameField = z
  .string()
  .trim()
  .min(2, "نام خانوادگی باید دستِ‌کم ۲ حرف باشد")
  .max(40, "نام خانوادگی حداکثر ۴۰ حرف است")
  .regex(PERSIAN_NAME, "نام خانوادگی را به فارسی بنویس");

/* ───────────────────────────── پایه و مکان ─────────────────────────────── */

export const GRADES = ["10", "11", "12"] as const;
export type Grade = (typeof GRADES)[number];

/** برچسبِ فارسیِ پایه. اینجا و نه در دیتابیس — همان قاعدهٔ
 *  `lib/plus/labels.ts`: عوض کردنِ یک عبارت نباید migration بخواهد. */
export const GRADE_LABEL: Record<Grade, string> = {
  "10": "دهم",
  "11": "یازدهم",
  "12": "دوازدهم",
};

export const gradeField = z.enum(GRADES, { message: "پایهٔ تحصیلی نامعتبر است" });

/** شناسهٔ استان — شکلش اینجا، وجودش در `isValidLocation`. */
export const provinceIdField = z
  .string()
  .regex(/^IR\d{3}$/, "استان نامعتبر است");

export const cityIdField = z.string().regex(/^IR\d{6}$/, "شهر نامعتبر است");

export const schoolField = z
  .string()
  .trim()
  .min(2, "نام مدرسه باید دستِ‌کم ۲ حرف باشد")
  .max(120, "نام مدرسه حداکثر ۱۲۰ نویسه است");

/**
 * «خالی یعنی پاک کن».
 *
 * ⚠️ این helper وجود دارد چون فرمِ HTML هیچ راهی برای فرستادنِ `null` ندارد:
 * یک `<select>` که کاربر خالی‌اش می‌گذارد، رشتهٔ `""` می‌فرستد. بدونِ این
 * تبدیل، رشتهٔ خالی به‌عنوانِ یک مقدارِ واقعی در دیتابیس می‌نشست و بعد
 * `users_province_format_check` کلِ ذخیره را رد می‌کرد — با یک خطای ۵۰۰ که
 * هیچ‌چیز دربارهٔ علتش نمی‌گفت.
 *
 * `null` و `undefined` هم پذیرفته می‌شوند: کلاینت ممکن است فیلد را اصلاً
 * نفرستد، و مقدارِ اولیهٔ فرم برای فیلدِ خالی `null` است.
 *
 * ⚠️ چرا `z.union` و نه `z.preprocess`:
 *
 * `preprocess` نوعِ *ورودیِ* شِما را `unknown` می‌کند، و react-hook-form
 * دقیقاً همان نوع را برای `useForm` می‌خواهد. نتیجه‌اش یک خطای تایپِ
 * طولانی بود که می‌گفت `unknown` به `string | null` نمی‌نشیند — یعنی فرم
 * اصلاً کامپایل نمی‌شد. با `union` هر دو نوع صریح می‌مانند:
 *
 *     ورودی  → string | null | undefined
 *     خروجی  → string | null
 */
function optional<T extends z.ZodType<string, string>>(schema: T) {
  return z
    .union([z.literal(""), z.null(), z.undefined(), schema])
    .transform((v) => (v === "" || v === undefined ? null : v));
}

/* ──────────────────────── پروفایلِ عمومی (بند ۲ و ۳) ────────────────────── */

/**
 * ⚠️ `desiredRole` اینجاست و `role` نیست — و این تفاوت کلِ بند ۹ است.
 *
 * چیزی که کاربر می‌فرستد فقط می‌تواند در ستونِ `desired_role` بنشیند، که
 * هیچ دری را باز نمی‌کند. اگر روزی کسی وسوسه شد اسمش را به `role` تغییر
 * بدهد تا «تمیزتر» شود، همان لحظه هر کاربری با یک درخواستِ ساده مدیر
 * می‌شود. توضیحِ کامل بالای migration ۰۰۹.
 */
export const profileSchema = z
  .object({
    firstName: firstNameField,
    lastName: lastNameField,
    provinceId: optional(provinceIdField),
    cityId: optional(cityIdField),
    school: optional(schoolField),
    grade: optional(gradeField),
    desiredRole: z.enum(["student", "teacher"], { message: "نقش نامعتبر است" }),
  })
  // ⚠️ جفتِ استان/شهر با هم سنجیده می‌شود و نه جدا-جدا. توضیحش بالای
  // `isValidLocation` در `lib/geo` است: هر دو شناسه می‌توانند معتبر باشند و
  // کنارِ هم بی‌معنا.
  .refine((d) => isValidLocation(d.provinceId, d.cityId), {
    message: "شهر انتخاب‌شده در استان انتخاب‌شده نیست",
    path: ["cityId"],
  });

/**
 * ⚠️ دو نوع و نه یکی، و react-hook-form هر دو را لازم دارد.
 *
 * `ProfileFormValues` چیزی است که فرم *نگه می‌دارد* (یک `<select>` خالی
 * رشتهٔ `""` است)، و `ProfileInput` چیزی است که بعد از اعتبارسنجی بیرون
 * می‌آید و سرور می‌نویسد (`""` شده `null`). یکی گرفتنشان یعنی یا فرم
 * نمی‌تواند خالی بماند، یا سرور رشتهٔ خالی در ستونِ شناسهٔ استان می‌نویسد.
 */
export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileInput = z.output<typeof profileSchema>;

/* ────────────────────── درخواستِ فعال‌سازیِ دبیر (بند ۵) ─────────────────── */

/**
 * کد ملی — با رقمِ کنترلی، نه فقط «ده رقم».
 *
 * `transform` قبل از `refine` می‌آید تا ارقامِ فارسی و خط تیره‌ها اول یکدست
 * شوند؛ وگرنه «۰۰۱-۲۳۴۵۶۷-۸» که کاملاً معتبر است، رد می‌شد.
 */
export const nationalIdField = z
  .string()
  .trim()
  .min(1, "کد ملی را وارد کنید")
  .transform((v) => normalizeNationalId(v) ?? v)
  .refine(isValidNationalId, "کد ملی معتبر نیست");

/**
 * ⚠️ فایلِ حکم در این شِما **نیست**.
 *
 * فایل از `multipart/form-data` می‌آید و اعتبارسنجیِ واقعی‌اش هم چیزی نیست
 * که zod بتواند بکند: نوعِ واقعیِ فایل باید از *بایت‌های خودش* خوانده شود و
 * نه از هدرِ مرورگر. آن کار در `lib/teacher/documents.ts` انجام می‌شود، با
 * همان استدلالی که کنارِ `detectAudioFile` در `lib/storage` نوشته شده.
 *
 * ⚠️ `phone` هم اینجا نیست و عمدی است: شماره از ردیفِ *تأییدشدهٔ* خودِ
 * کاربر در دیتابیس خوانده می‌شود و نه از بدنهٔ درخواست. اگر کلاینت
 * می‌فرستادش، هر کسی می‌توانست درخواستی با شمارهٔ شخصِ دیگری ثبت کند.
 */
export const teacherRequestSchema = z
  .object({
    nationalId: nationalIdField,
    provinceId: provinceIdField,
    cityId: cityIdField,
    school: schoolField,
  })
  .refine((d) => isValidLocation(d.provinceId, d.cityId), {
    message: "شهر انتخاب‌شده در استان انتخاب‌شده نیست",
    path: ["cityId"],
  });

export type TeacherRequestInput = z.output<typeof teacherRequestSchema>;

/* ──────────────────────────── کلاس (بند کلاس‌ها) ────────────────────────── */

export const classNameField = z
  .string()
  .trim()
  .min(2, "نام کلاس باید دستِ‌کم ۲ نویسه باشد")
  .max(60, "نام کلاس حداکثر ۶۰ نویسه است");

/**
 * کدِ عضویت، آن‌طور که دانش‌آموز تایپش می‌کند.
 *
 * ⚠️ `toUpperCase` و حذفِ فاصله و خط تیره قبل از هر بررسی: کد روی تخته
 * نوشته می‌شود و کسی که «a7k-2p9» تایپ کند باید همان کلاس را پیدا کند. رد
 * کردنش با پیامِ «کد نامعتبر است» یعنی دانش‌آموزی که کد را درست خوانده،
 * فکر می‌کند دبیرش اشتباه نوشته.
 */
export const joinCodeField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-‌]/g, "").toUpperCase())
  .refine((v) => /^[A-Z2-9]{6,10}$/.test(v), "کد عضویت معتبر نیست");
