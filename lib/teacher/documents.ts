import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { uploadsRoot } from "@/lib/storage";
/* ⚠️ قواعدِ مسیر در یک ماژولِ خالصِ جدا زندگی می‌کنند تا قابلِ تست باشند —
   این ماژول `"server-only"` است و هیچ تستی نمی‌تواند واردش کند. و این دو
   تابع دقیقاً همان‌هایی‌اند که شکستنشان یعنی نشتِ سندِ هویتی. */
import { isPrivateRootSafe, safeDocumentPath } from "./doc-paths";

/**
 * حکمِ کارگزینی — انبارِ **خصوصی**.
 *
 * =============================================================================
 * ⚠️ چرا `lib/storage` اینجا استفاده نمی‌شود
 * =============================================================================
 *
 * آن ماژول یک انبارِ **عمومی** است و درست هم هست: صوتِ کوییز و نگارهٔ
 * جفت‌های ادبی باید با یک `<audio src>` ساده باز شوند. برای همین Caddy کلِ
 * `/uploads/*` را مستقیم از دیسک سرو می‌کند و هیچ بررسیِ دسترسی‌ای در کار
 * نیست — هر کسی که نشانی را داشته باشد، فایل را دارد.
 *
 * حکمِ کارگزینی دقیقاً برعکسش را می‌خواهد (بند ۹: «فایل حکم فقط برای
 * ادمین‌های مجاز قابل مشاهده باشد»). و «نشانی را حدس نمی‌زنند» دفاع نیست:
 * نشانی‌ها در لاگِ پروکسی، تاریخچهٔ مرورگر، هدرِ Referer و هر افزونه‌ای که
 * کاربر نصب کرده می‌نشینند. یک سندِ هویتی که فقط با «کسی نمی‌داند کجاست»
 * محافظت شود، محافظت‌نشده است.
 *
 * پس این فایل‌ها **بیرونِ** ریشهٔ عمومی می‌نشینند و تنها راهِ خواندنشان یک
 * route handler است که اول `requireAdmin()` را صدا می‌زند:
 * `app/api/v1/admin/teacher-requests/[id]/document/route.ts`.
 *
 * ⚠️ `assertPrivateRoot()` پایین همین را در زمانِ اجرا تضمین می‌کند. بدونِ
 * آن، یک `TEACHER_DOCS_DIR=./uploads/docs` در فایلِ محیط — که کاملاً بی‌گناه
 * به نظر می‌رسد — کلِ این استدلال را خاموش می‌کرد و هیچ‌کس متوجه نمی‌شد.
 */

/* ────────────────────────── ریشهٔ انبارِ خصوصی ─────────────────────────── */

/**
 * ⚠️ همان الگوی `uploadsRoot()`: مسیرِ پیش‌فرض یک `join` سادهٔ زمانِ اجراست و
 * نه `resolve()` روی یک رشتهٔ ثابت.
 *
 * دلیلش در `lib/storage` نوشته شده و تکرارش می‌ارزد: `resolve("./x")` برای
 * تحلیلگرِ ایستای Next یعنی «به فایل‌سیستم دست می‌زند و نمی‌دانم کجا»، و
 * واکنشش این است که برای احتیاط کلِ پروژه را در خروجی standalone بگذارد —
 * یک بار ۱٫۲ گیگابایت به‌جای ۱۲۴ مگابایت، با سورسِ سایت روی هاستِ عمومی.
 */
function docsRoot(): string {
  const configured = process.env.TEACHER_DOCS_DIR;
  return configured ? resolve(configured) : join(process.cwd(), "private-uploads", "teacher-docs");
}

/**
 * ریشهٔ خصوصی نباید داخلِ ریشهٔ عمومی باشد.
 *
 * ⚠️ این بررسی در *هر* نوشتن و خواندن انجام می‌شود و نه یک بار در زمانِ
 * بالا آمدن. یک متغیرِ محیطیِ اشتباه در استقرارِ بعدی باید همان‌جا و با
 * صدای بلند بشکند، نه اینکه ساکت اجازه بدهد حکمِ کارگزینیِ نفرِ بعد روی
 * `/uploads` بنشیند و برای همیشه آنجا بماند.
 *
 * دو طرفه سنجیده می‌شود: نه خصوصی زیرِ عمومی، و نه عمومی زیرِ خصوصی (که
 * همان قدر بد است — یعنی route مدیر می‌تواند فایل‌های عمومی را هم بدهد، ولی
 * مهم‌تر اینکه نشان می‌دهد پیکربندی به هم ریخته).
 */
function assertPrivateRoot(root: string): void {
  if (!isPrivateRootSafe(root, uploadsRoot())) {
    throw new Error(
      "TEACHER_DOCS_DIR نباید داخل (یا شاملِ) پوشهٔ عمومیِ uploads باشد — " +
        "فایل‌های حکم کارگزینی در آن حالت برای همه قابل خواندن می‌شوند.",
    );
  }
}

/* ────────────────────── نوعِ واقعیِ فایل، از بایت‌هایش ──────────────────── */

export type DocumentCheck =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; error: string };

/** «آیا از بایت i این رشتهٔ ASCII شروع می‌شود؟» — همان helper در
 *  `lib/storage`، اینجا تکرار شده تا این ماژول به آن وابسته نباشد. */
function hasAscii(head: Buffer, offset: number, marker: string): boolean {
  return head.subarray(offset, offset + marker.length).toString("latin1") === marker;
}

/**
 * قالب‌های پذیرفته‌شده برای حکم.
 *
 * ⚠️ همان قاعدهٔ `detectImageFile`: پسوند و MIMEِ اعلامی فقط گزینه‌ها را
 * محدود می‌کنند؛ آنچه تصمیم می‌گیرد، بایت‌های خودِ فایل است. `file.type`
 * همان چیزی است که *فرستنده* نوشته و هر اسکریپتی می‌تواند هر چیزی بنویسد.
 *
 * ⚠️ SVG عمداً نیست و نباید اضافه شود — یک SVG یک سندِ اجرایی است. اینجا
 * حتی اگر فایل هرگز به مرورگرِ کاربرِ عادی نرسد، باز هم به مرورگرِ *مدیر*
 * می‌رسد؛ یعنی XSS روی حسابی که بیشترین دسترسی را دارد.
 *
 * ⚠️ و هیچ فرمتِ Office ای هم نیست (doc/docx/zip): یک حکمِ کارگزینی اسکن یا
 * PDF است، و پذیرفتنِ یک ظرفِ ZIP یعنی باز کردنِ دری که بستنش کارِ ما نیست.
 */
const DOCUMENT_FORMATS: readonly {
  extension: string;
  contentType: string;
  mimeTypes: readonly string[];
  matches: (head: Buffer) => boolean;
}[] = [
  {
    extension: "pdf",
    contentType: "application/pdf",
    mimeTypes: ["application/pdf"],
    matches: (head) => hasAscii(head, 0, "%PDF-"),
  },
  {
    extension: "jpg",
    contentType: "image/jpeg",
    mimeTypes: ["image/jpeg", "image/jpg", "image/pjpeg"],
    matches: (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  },
  {
    extension: "png",
    contentType: "image/png",
    mimeTypes: ["image/png"],
    matches: (head) =>
      head[0] === 0x89 && hasAscii(head, 1, "PNG") && head[4] === 0x0d && head[5] === 0x0a,
  },
  {
    extension: "webp",
    contentType: "image/webp",
    mimeTypes: ["image/webp"],
    matches: (head) => hasAscii(head, 0, "RIFF") && hasAscii(head, 8, "WEBP"),
  },
];

export async function detectTeacherDocument(file: File): Promise<DocumentCheck> {
  const head = Buffer.from(await file.slice(0, 16).arrayBuffer());
  if (head.length < 12) return { ok: false, error: "فایل خالی یا ناقص است." };

  const declared = (file.type || "").toLowerCase().split(";")[0].trim();
  const preferred = DOCUMENT_FORMATS.filter((f) => f.mimeTypes.includes(declared));
  const rest = DOCUMENT_FORMATS.filter((f) => !f.mimeTypes.includes(declared));

  for (const format of [...preferred, ...rest]) {
    if (format.matches(head)) {
      return { ok: true, extension: format.extension, contentType: format.contentType };
    }
  }

  return {
    ok: false,
    error: "فایل باید PDF یا تصویر (jpg، png، webp) باشد. فایل فرستاده‌شده هیچ‌کدام نیست.",
  };
}

/** سقفِ حجم — یک اسکنِ تک‌صفحه‌ای هیچ دلیلی ندارد از این بزرگ‌تر باشد، و
 *  هر مگابایتِ اضافه روی دیسکی می‌نشیند که هرگز پاک نمی‌شود. */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

/* ──────────────────────────── نوشتن و خواندن ──────────────────────────── */

export type StoredDocument = {
  /** کلیدِ داخلی — همان چیزی که در `teacher_requests.document_key` می‌نشیند. */
  key: string;
  contentType: string;
  size: number;
};

/**
 * نامِ فایل روی دیسک.
 *
 * ⚠️ هیچ بخشی از نامِ کاربر در آن نیست — نه حتی به‌عنوان برچسبِ خوانا، بر
 * خلافِ `safeName` در `lib/storage`.
 *
 * آنجا نگه داشتنِ یک برچسب کمک می‌کرد مدیر در پوشهٔ uploads بفهمد چه چیزی
 * چیست. اینجا برعکس است: نامِ فایلی که کاربر انتخاب کرده می‌تواند خودش یک
 * دادهٔ شخصی باشد («حکم-کارگزینی-احمدی-۱۴۰۳.pdf») و نوشتنش روی دیسک یعنی
 * حتی فهرستِ پوشه هم اطلاعات لو می‌دهد. نامِ اصلی در ستونِ `document_name`
 * می‌ماند، جایی که فقط با گذشتن از `requireAdmin()` خوانده می‌شود.
 */
function documentName(extension: string): string {
  return `${Date.now()}-${randomBytes(16).toString("hex")}.${extension}`;
}

/** مسیرِ امنِ روی دیسک برای یک کلید، یا null اگر از ریشه بیرون بزند. */
function safeTarget(key: string): string | null {
  const root = docsRoot();
  assertPrivateRoot(root);
  return safeDocumentPath(root, key);
}

/**
 * فایل را در انبارِ خصوصی می‌نویسد.
 *
 * ⚠️ نوعِ فایل را خودش بررسی **نمی‌کند** — فراخوان باید قبلش
 * `detectTeacherDocument` را زده باشد و `extension` را از همان‌جا بدهد.
 * جدا بودنشان عمدی است: بررسیِ نوع باید *پیش* از هر کارِ دیگری انجام شود
 * (پیش از سقفِ نرخ، پیش از کوئری)، و آمیختنش با نوشتن یعنی روزی کسی مسیرِ
 * تازه‌ای بنویسد که نوشتن را صدا می‌زند و بررسی را نه.
 */
export async function storeTeacherDocument(
  file: File,
  detected: { extension: string; contentType: string },
): Promise<StoredDocument> {
  const root = docsRoot();
  assertPrivateRoot(root);

  const key = documentName(detected.extension);

  // کمربندِ دوم، مثل `LocalDiskAdapter.put` — و از همان تابعی که مسیرِ
  // خواندن هم از آن می‌گذرد، تا نوشتن و خواندن دو قاعدهٔ متفاوت نداشته
  // باشند.
  const target = safeDocumentPath(root, key);
  if (!target) throw new Error("مسیر فایل نامعتبر است.");

  await mkdir(root, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  return { key, contentType: detected.contentType, size: bytes.byteLength };
}

export type OpenedDocument = { stream: ReadableStream; size: number };

/**
 * فایل را برای **مدیر** باز می‌کند.
 *
 * ⚠️ این تابع هیچ بررسیِ دسترسی‌ای نمی‌کند و نباید بکند — کارش فقط خواندنِ
 * دیسک است. گاردِ `requireAdmin()` در همان route handler است که صدایش
 * می‌زند، و آن تنها جایی است که این تابع از آن فراخوانی می‌شود.
 *
 * `null` یعنی فایل نیست: یا کلید بدشکل است، یا ردیفِ دیتابیس به فایلی اشاره
 * می‌کند که دیگر روی دیسک نیست. هر دو برای فراخوان «۴۰۴» اند.
 */
export async function openTeacherDocument(key: string): Promise<OpenedDocument | null> {
  const target = safeTarget(key);
  if (!target) return null;

  let info;
  try {
    info = await stat(target);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;

  // Range پیاده نشده و لازم هم نیست: این فایل پخش نمی‌شود، یک بار باز یا
  // دانلود می‌شود. (چرایی‌اش برعکسِ `app/uploads/[...path]` است، جایی که
  // wavesurfer بایت‌های میانی می‌خواهد.)
  const stream = (await import("node:stream")).Readable.toWeb(
    createReadStream(target),
  ) as unknown as ReadableStream;

  return { stream, size: info.size };
}

/**
 * حذفِ فایل.
 *
 * ⚠️ فقط وقتی صدا زده می‌شود که *ثبتِ* درخواست شکست خورده باشد — یعنی
 * فایلی که هیچ ردیفی به آن اشاره نمی‌کند. ردیفِ رد شده یا تأییدشده فایلش را
 * نگه می‌دارد: مبنای تصمیمِ مدیر باید بعداً هم قابلِ دیدن باشد.
 *
 * نبودنِ فایل خطا نیست — همان نتیجهٔ مطلوب است.
 */
export async function removeTeacherDocument(key: string): Promise<void> {
  const target = safeTarget(key);
  if (!target) return;
  await unlink(target).catch(() => {});
}

/**
 * حذفِ فایل، با **گزارشِ موفقیت**.
 *
 * ⚠️ فرقش با `removeTeacherDocument` این است که شکست را قورت نمی‌دهد.
 *
 * برای مسیرِ «ارسال دوباره» بی‌صدا بودن درست است (بدترین حالتش یک فایلِ
 * یتیم است و ردیفِ دیتابیس سالم می‌ماند). ولی وقتی حسابِ کاربر حذف می‌شود،
 * ردیف برای همیشه می‌رود و دیگر هیچ‌چیز نمی‌گوید این فایل مالِ که بود —
 * پس شکستش باید دیده و قابلِ پیگیری شود.
 */
export async function removeTeacherDocumentChecked(key: string): Promise<boolean> {
  const target = safeTarget(key);
  if (!target) return false;

  try {
    await unlink(target);
    return true;
  } catch (err) {
    // نبودنِ فایل یعنی همان نتیجهٔ مطلوب — قبلاً پاک شده.
    if ((err as { code?: string })?.code === "ENOENT") return true;
    return false;
  }
}

/**
 * نامِ همهٔ فایل‌هایی که در انبارِ خصوصی هستند.
 *
 * ⚠️ فقط برای آشتی‌دادنِ دیسک با دیتابیس (`scripts/check-teacher-docs.ts`).
 * خروجی‌اش هرگز نباید به کلاینت برسد — فهرستِ کلیدها همان چیزی است که کلِ
 * طراحیِ این ماژول می‌خواهد پنهانش کند.
 */
export async function listStoredDocumentKeys(): Promise<string[]> {
  const root = docsRoot();
  assertPrivateRoot(root);

  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch (err) {
    // پوشه هنوز ساخته نشده = هیچ فایلی نیست.
    if ((err as { code?: string })?.code === "ENOENT") return [];
    throw err;
  }
}
