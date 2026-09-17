"use client";

import { apiGet, apiPost } from "@/lib/api/client";
import { ROLE_HUNT_CONFIG } from "./config";
import type { RoleHuntRound } from "./types";

/** خطای قابلِ نمایش — بازی باید بتواند صادقانه بگوید چه شد. */
export class RoleHuntSourceError extends Error {}

/**
 * دورهای یک نشست.
 *
 * ⚠️ هیچ fallbackی به دادهٔ ساختگی ندارد، به همان دلیلی که
 * `lib/grammar-circuit/source.ts` ندارد: تمرینی که دانش‌آموز فکر کند محتوای
 * درسی است ولی نباشد، از یک پیام خطا بدتر است.
 */
export async function fetchRoleHuntRounds(count: number, signal?: AbortSignal): Promise<RoleHuntRound[]> {
  const take = Math.min(Math.max(count, 1), ROLE_HUNT_CONFIG.maxRoundsPerRequest);
  const result = await apiGet<{ rounds: RoleHuntRound[] }>(`/api/v1/role-hunt/rounds?count=${take}`);
  if (signal?.aborted) return [];
  if (!result.ok) {
    throw new RoleHuntSourceError(result.errors.join(" ") || "دریافتِ دورها ممکن نشد.");
  }
  if (result.data.rounds.length === 0) {
    throw new RoleHuntSourceError("هنوز مصراعی برای این بازی آماده نیست.");
  }
  return result.data.rounds;
}

/**
 * ثبتِ یک پاسخ.
 *
 * ⚠️ درست/غلط را نمی‌فرستد و نمی‌گیرد که به آن تکیه کند — سرور خودش از روی
 * payloadِ پرسش می‌سنجد. `roundId` هم فقط کلیدِ یکتاییِ ثبت است: اگر شبکه
 * درخواست را دوباره بفرستد، همان ردیف دوباره نوشته نمی‌شود.
 */
export async function submitRoleHuntAnswer(input: {
  roundId: string;
  questionId: string;
  selectedTokenId: string;
}): Promise<void> {
  await apiPost<{ saved: boolean }>("/api/v1/role-hunt/answers", input);
}
