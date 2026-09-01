/**
 * لایهٔ رصدپذیری سروا — یک ورودی برای همهٔ کد سرور.
 *
 * سه چیزِ کاملاً جدا اینجا کنار هم می‌آیند و نباید با هم اشتباه شوند:
 *
 *   ۱) **لاگ عملیاتی** (همین فایل) — برای توسعه‌دهنده و عملیات. مقصدش
 *      stdout/stderr کانتینر است و با `docker compose logs app` دیده می‌شود.
 *      موقتی است؛ چرخش دارد و پاک می‌شود.
 *
 *   ۲) **ردیابی خطا** (`recordError` در lib/admin/audit.ts) — خطاهای قابل
 *      رسیدگی، در جدول `app_error_log` و صفحهٔ /admin/activity. برای کسی که
 *      به سرور دسترسی ندارد.
 *
 *   ۳) **ممیزی مدیران** (`recordAudit` در lib/admin/audit.ts) — سابقهٔ
 *      کسب‌وکاریِ تغییرات، در `admin_audit_log`. فقط افزودنی و دائمی.
 *
 * هر سه با `request_id` به هم وصل می‌شوند: یک درخواست، یک شناسه، در هر سه جا.
 */

export { logger, addSink, configureLogger, resetLogger, LEVEL_NAMES } from "./logger";
export type { Logger, LogLevel, LogFields, LogRecord, LogSink } from "./logger";

export {
  REQUEST_ID_HEADER,
  newRequestId,
  normalizeRequestId,
  runWithRequestContext,
  currentRequestContext,
  currentRequestId,
  attachUserId,
} from "./context";
export type { RequestContext } from "./context";

export {
  redactDeep,
  redactRecord,
  scrubText,
  sanitizeUrl,
  sanitizeRoutePath,
  REDACTED,
} from "./redact";
export type { RedactProfile, RedactOptions } from "./redact";

export { serializeError, markReported, wasReported } from "./serialize";
export type { SerializedError } from "./serialize";
