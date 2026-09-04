import { z } from "zod";

export const hemistichSchema = z.string().trim()
  .min(10, "مصراع را به‌طور کامل وارد نمایید")
  .max(160, "هر مصراع باید حداکثر ۱۶۰ نویسه داشته باشد")
  .regex(/^[\u0600-\u06FF\u200C-\u200F\s.,:;!?«»…“”"'()\-–—]+$/, "فقط متن فارسی و نشانه‌های نگارشی پذیرفته هستند");

export const coupletSchema = z.object({ poem1: hemistichSchema, poem2: hemistichSchema });
export const meterLookupSchema = coupletSchema.extend({ poemId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional() });
