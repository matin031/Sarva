import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { jalaliLong } from "@/lib/panel/format";

/**
 * «سروا پلاس» در صفحهٔ تنظیمات حساب.
 *
 * ⚠️ چرا اینجا و نه فقط در `/panel/subscription`: کاربری که می‌خواهد پلاس را
 * روشن کند، اول سراغِ «تنظیمات» می‌رود — همان‌جایی که در هر برنامهٔ دیگری
 * کلیدهای روشن/خاموشِ حساب هستند. تا امروز این صفحه هیچ اشاره‌ای به پلاس
 * نداشت و آن کاربر بن‌بست می‌خورد.
 *
 * ⚠️ هر پنج حالتِ `PlusStatus` جدا هستند و به‌خصوص `unavailable` هرگز به
 * «اشتراک نداری، بخر» ترجمه نمی‌شود — دلیلش بالای `lib/plus/types.ts` نوشته
 * شده: آن پیام به کسی که دیروز پول داده می‌گوید پولش را دور ریخته، و ممکن
 * است دوباره بخرد.
 */
export default async function PlusSettingCard() {
  const status = await getPlusStatus();

  // پلاس از پنل مدیریت خاموش است: سایت رایگان است و هیچ صفحهٔ خریدی وجود
  // ندارد. کارتی که به `/plus` لینک بدهد، به صفحه‌ای می‌رود که ۴۰۴ می‌دهد.
  if (status.state === "off") return null;

  const copy = (() => {
    switch (status.state) {
      case "active":
        return {
          title: status.isTrial ? "دسترسی آزمایشی سروا پلاس روشن است" : "سروا پلاس روشن است",
          body:
            status.expiresAt === null
              ? "دسترسی‌ات دائمی است."
              : `تا ${jalaliLong(status.expiresAt)} فعال است.`,
          cta: "مدیریت اشتراک",
          href: "/panel/subscription",
          variant: "outline" as const,
        };
      case "expired":
        return {
          title: "سروا پلاس‌ات تمام شده",
          body: "سابقه و پیشرفتت سرِ جایش است؛ با تمدید، همان‌جا ادامه می‌دهی.",
          cta: "روشن کردن سروا پلاس",
          href: "/plus",
          variant: "gold" as const,
        };
      case "revoked":
        return {
          title: "دسترسی سروا پلاس‌ات لغو شده",
          body: "برای پیگیری با پشتیبانی در تماس باش.",
          cta: "پیام به پشتیبانی",
          href: "/panel/support",
          variant: "outline" as const,
        };
      case "unavailable":
        return {
          title: "وضعیت سروا پلاس‌ات معلوم نشد",
          body: "در بررسی وضعیت اشتراک مشکلی پیش آمد. این یعنی «نمی‌دانیم»، نه «نداری».",
          cta: "دیدن وضعیت اشتراک",
          href: "/panel/subscription",
          variant: "outline" as const,
        };
      default:
        return {
          title: "سروا پلاس",
          body: "تحلیل ضعف در وزن‌ها و نقش‌های دستوری، دفتر اشتباه‌ها و تمرین پیشنهادی هر روز.",
          cta: "روشن کردن سروا پلاس",
          href: "/plus",
          variant: "gold" as const,
        };
    }
  })();

  return (
    <Card data-tone="gold">
      <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/12 text-gold-ink">
          <Sparkles aria-hidden className="size-5" strokeWidth={1.7} />
        </span>

        <div className="min-w-0 flex-1 basis-56">
          <h2 className="text-base font-bold">{copy.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <Button asChild variant={copy.variant} className="ms-auto">
          <Link href={copy.href}>
            <Sparkles aria-hidden />
            {copy.cta}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
