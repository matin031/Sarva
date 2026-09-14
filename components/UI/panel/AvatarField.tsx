"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { errorText } from "@/lib/api/client";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import type { ApiResult } from "@/lib/api/client";

/**
 * تصویر پروفایل — اختیاری (بند ۲).
 *
 * ⚠️ این تنها بخشِ فرمِ پروفایل است که دکمهٔ ذخیرهٔ خودش را دارد، چون
 * مسیرش جداست: فایل با `multipart/form-data` می‌رود و بقیهٔ فرم با JSON.
 * یکی کردنشان یعنی هر بار ذخیرهٔ نام، کلِ تصویر دوباره آپلود شود.
 *
 * ⚠️ و به همین دلیل `apiPost` استفاده نمی‌شود: آن تابع بدنه را
 * `JSON.stringify` می‌کند و `content-type: application/json` می‌گذارد.
 * برای `FormData` هر دو غلط‌اند — مرورگر باید خودش `boundary` را در هدر
 * بنویسد، و اگر ما `content-type` را دستی بگذاریم آن را جا می‌اندازد و
 * سرور بدنه را نمی‌تواند بخواند.
 */

async function sendAvatar(file: File): Promise<ApiResult<unknown>> {
  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetch("/api/v1/auth/profile/avatar", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as ApiResult<unknown> | null;
    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      return { ok: false, errors: ["پاسخ نامعتبر از سرور دریافت شد."] };
    }
    return payload;
  } catch {
    return { ok: false, errors: ["ارتباط با سرور برقرار نشد."] };
  }
}

async function clearAvatar(): Promise<ApiResult<unknown>> {
  try {
    const response = await fetch("/api/v1/auth/profile/avatar", {
      method: "DELETE",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as ApiResult<unknown> | null;
    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      return { ok: false, errors: ["پاسخ نامعتبر از سرور دریافت شد."] };
    }
    return payload;
  } catch {
    return { ok: false, errors: ["ارتباط با سرور برقرار نشد."] };
  }
}

export default function AvatarField() {
  const { user } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const run = async (action: () => Promise<ApiResult<unknown>>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);

    if (!result.ok) {
      setError(errorText(result));
      return;
    }
    // ⚠️ تصویر در سایدبار و در فهرستِ اعضای کلاس هم دیده می‌شود؛ بدونِ این،
    // تا رفرشِ بعدی تصویرِ قبلی می‌ماند.
    refreshCurrentUser();
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-foreground/[0.04]">
        {user.avatarUrl ? (
          /* ⚠️ `unoptimized` چون این فایل در زمانِ اجرا آپلود شده و بهینه‌سازِ
             تصویرِ Next آن را نمی‌شناسد. بدونِ آن، هر تصویرِ تازه یک درخواستِ
             بهینه‌سازیِ ناموفق می‌شد و کادر خالی می‌ماند. */
          <Image
            src={user.avatarUrl}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          <UserRound aria-hidden className="size-8 text-muted-foreground/60" />
        )}
      </span>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            // ⚠️ فقط یک راهنما برای پنجرهٔ انتخابِ فایل است و نه یک گارد:
            // سرور نوع را از بایت‌های خودِ فایل می‌خواند.
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // ⚠️ مقدارِ input پاک می‌شود تا انتخابِ دوبارهٔ *همان* فایل هم
              // رویداد بدهد. بدونِ آن، کاربری که تصویر را اصلاح کرده و
              // دوباره همان را انتخاب می‌کند، هیچ اتفاقی نمی‌بیند.
              e.target.value = "";
              if (file) void run(() => sendAvatar(file));
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "در حال ارسال…" : user.avatarUrl ? "تغییر تصویر" : "افزودن تصویر"}
          </Button>

          {user.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void run(clearAvatar)}
            >
              برداشتن
            </Button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          اختیاری. png، jpg یا webp تا ۲ مگابایت.
        </p>
        {error && (
          <p role="alert" className="text-xs leading-relaxed text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
