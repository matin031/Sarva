"use client";

import type { ApiResult } from "./http";

/**
 * فراخوانی API از مرورگر.
 *
 * تا دیروز کد کلاینت مستقیم با کتابخانهٔ Supabase به دیتابیس وصل می‌شد و پاسخ
 * `{ data, error }` می‌گرفت. حالا از این می‌گذرد، که همان شکل
 * `{ ok, data } | { ok, errors }` را برمی‌گرداند که سرتاسر پروژه استفاده
 * می‌شود.
 *
 * کوکی‌ها خودکار همراه درخواست می‌روند (same-origin)، پس هیچ توکنی در کد
 * کلاینت دست‌به‌دست نمی‌شود — که کل نکتهٔ httpOnly بودنشان است.
 */

export type { ApiResult };

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<ApiResult<T>> {
  const { json, ...rest } = init;

  try {
    const response = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      // پاسخ‌ها به کوکی وابسته‌اند؛ کش مرورگر می‌تواند پاسخ یک کاربر را به
      // کاربر بعدی همان دستگاه بدهد.
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as ApiResult<T> | null;

    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      // پاسخی که اصلاً شکل API ما را ندارد — مثلاً صفحهٔ خطای پروکسی
      return { ok: false, errors: ["پاسخ نامعتبر از سرور دریافت شد."] };
    }

    return payload;
  } catch {
    // شبکه قطع است یا درخواست لغو شده. پیام باید به زبان کاربر باشد، نه
    // «Failed to fetch».
    return { ok: false, errors: ["ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید."] };
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, json?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: "POST", json: json ?? {} });
}

export function apiPatch<T>(path: string, json?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PATCH", json: json ?? {} });
}

export function apiDelete<T>(path: string, json?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: "DELETE", json: json ?? {} });
}

/** پیام خطای قابل نمایش از یک نتیجهٔ ناموفق. */
export function errorText(result: { ok: false; errors: string[] }): string {
  return result.errors.join("\n") || "خطای ناشناخته.";
}
