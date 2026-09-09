"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { markNotificationRead } from "./notifications";

/**
 * اکشن‌های کوچکِ خودِ کاربر روی سروا پلاس.
 *
 * ⚠️ `userId` هرگز از ورودی نمی‌آید — از سشن. بدونِ آن، بستنِ اعلان یعنی
 * «هر کسی می‌تواند اعلانِ هر کسی را خوانده‌شده کند».
 */
export async function dismissPlusWelcome(notificationId: unknown): Promise<void> {
  const user = await requireUser();
  if (!isUuid(notificationId)) return;

  await markNotificationRead(user.id, notificationId);
  revalidatePath("/panel/home");
}
