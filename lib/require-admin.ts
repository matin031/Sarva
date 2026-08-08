/**
 * سازگاری با کد موجود.
 *
 * پانزده فایل (lib/admin/*، lib/exam/admin-actions.ts، lib/club/admin-actions.ts،
 * lib/quiz/admin-actions.ts) از این مسیر import می‌کنند و همه‌شان فقط `admin.id`
 * را از خروجی می‌خوانند. با نگه داشتن این فایل به‌عنوان یک re-export، مهاجرت
 * احراز هویت هیچ‌کدامشان را لمس نمی‌کند.
 *
 * پیاده‌سازی واقعی در lib/auth/current-user.ts است.
 */
export { requireAdmin } from "@/lib/auth/current-user";
