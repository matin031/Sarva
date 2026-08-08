"use client";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { BookmarkArea } from "@/lib/panel/types";

/** نوشتنِ نشان‌شده‌ها از مرورگر.
 *
 *  نشان کردن یک toggle است که به (کاربر، حوزه، مرجع) کلید خورده — ایندکس
 *  یکتای جدول همان را اجبار می‌کند، پس دو بار زدن هرگز دو ردیف باقی نمی‌گذارد.
 *
 *  امضای همهٔ توابع دست‌نخورده مانده تا BookmarkButton.tsx و صفحه‌های پنل
 *  تغییری لازم نداشته باشند. پارامتر userId هم به همین دلیل مانده، ولی دیگر
 *  فرستاده نمی‌شود: سرور کاربر را از کوکی می‌شناسد. اگر فرستاده می‌شد، هرکسی
 *  می‌توانست نشان‌شده‌های کس دیگری را بخواند یا دست بزند. */

export type BookmarkInput = {
  area: BookmarkArea;
  refId: string;
  title: string;
  subtitle?: string;
  payload?: Record<string, unknown>;
};

export async function isBookmarked(
  _userId: string,
  area: BookmarkArea,
  refId: string,
): Promise<boolean> {
  const result = await apiGet<{ bookmarked: boolean }>(
    `/api/v1/bookmarks?area=${encodeURIComponent(area)}&refId=${encodeURIComponent(refId)}`,
  );

  if (!result.ok) {
    // یک خواندنِ ناموفق نباید خودش را جای «نشان نشده» جا بزند — همان حالتی که
    // قبلاً به یک پرش مرموز در دکمه ختم می‌شد.
    console.error("isBookmarked:", result.errors.join(" "));
    return false;
  }

  return result.data.bookmarked;
}

/** نشان را به حالت مشخصی می‌برد.
 *
 *  هر دو شاخه idempotent اند: حذفی که چیزی را پیدا نکند موفق است، و درج روی
 *  کلید یکتا upsert می‌شود. نسخهٔ قدیمی اول حالت فعلی را می‌خواند و بعد درج
 *  می‌کرد، پس خواندنی که اشتباه برمی‌گشت به خطای کلید تکراری می‌خورد، دکمه
 *  برمی‌گشت، و به نظر می‌رسید نشان خودش خاموش شده. */
export async function setBookmark(
  _userId: string,
  input: BookmarkInput,
  next: boolean,
): Promise<void> {
  const result = next
    ? await apiPost("/api/v1/bookmarks", input)
    : await apiDelete("/api/v1/bookmarks", { area: input.area, refId: input.refId });

  if (!result.ok) throw new Error(result.errors.join("\n"));
}

export async function removeBookmark(id: string): Promise<void> {
  const result = await apiDelete("/api/v1/bookmarks", { id });
  if (!result.ok) throw new Error(result.errors.join("\n"));
}

export async function setBookmarkNote(id: string, note: string): Promise<void> {
  const result = await apiPatch("/api/v1/bookmarks", { id, note });
  if (!result.ok) throw new Error(result.errors.join("\n"));
}
