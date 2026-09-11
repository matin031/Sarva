import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * ادغام کلاس‌های Tailwind با حل تعارض.
 *
 * ⚠️ در `lib/cn.ts` است و نه `lib/utils.ts`، چون در این پروژه هر ماژولِ
 * `lib/*` یک موضوع دارد و «utils» به‌سرعت به انبارِ همه‌چیز تبدیل می‌شود.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
