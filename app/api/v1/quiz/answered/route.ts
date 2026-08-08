import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { handleError, ok } from "@/lib/api/http";

/**
 * GET /api/v1/quiz/answered — کدام سؤال‌ها را کاربر قبلاً جواب داده.
 *
 * بازی از این استفاده می‌کند تا سؤال‌های تکراری را از دور تازه کنار بگذارد.
 *
 * برای مهمان، فهرست خالی برمی‌گردد و نه ۴۰۱: مهمان می‌تواند بازی کند و فقط
 * تاریخچه‌اش ذخیره نمی‌شود.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ questionIds: [] as string[] });

    // بدون پارامتر، همهٔ پاسخ‌های کاربر برمی‌گردد. کلاینت قبلاً شناسه‌ها را در
    // .in(...) می‌فرستاد؛ چون تعداد سؤال‌های یک کاربر کوچک است، فرستادن کل
    // فهرست در URL (که می‌تواند به سقف طول برسد) ارزشی ندارد.
    const rows = await query<{ question_id: string }>(
      `select question_id from user_answers where user_id = $1`,
      [user.id],
    );

    return ok({ questionIds: rows.map((r) => r.question_id) });
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
