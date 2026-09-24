import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import type { Confusion, ErrorShape } from "@/lib/plus/insights";

/**
 * الگوی اشتباه‌ها — «چه چیزی را با چه چیزی عوضی می‌گیری».
 *
 * ⚠️ تنها بخشی از تحلیل که به جای «چقدر غلط زدی» می‌گوید «غلط‌هایت چه
 * شکلی‌اند». کسی که «مفاعیلن» را همیشه با «مفتعلن» اشتباه می‌گیرد، مشکلش
 * وزن نیست — تفکیکِ آن دوتاست، و هیچ درصدی این را نشان نمی‌دهد.
 */
export default function ErrorPatterns({
  confusions,
  shape,
}: {
  confusions: Confusion[];
  shape: ErrorShape | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الگوی اشتباه‌ها</CardTitle>
        <CardDescription>اشتباه‌هایی که بیش از یک بار تکرار شده‌اند.</CardDescription>
      </CardHeader>

      <CardContent>
        {shape && <ErrorShapeNote shape={shape} />}

        {confusions.length === 0 && !shape && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            هنوز اشتباه تکرارشونده‌ای پیدا نشده. اشتباهی که دو بار تکرار شود اینجا می‌آید.
          </p>
        )}

        {confusions.length > 0 && (
          <ul className="flex flex-col">
            {confusions.map((c) => (
              <li
                key={`${c.area}-${c.expected}-${c.chosen}`}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
              >
                <p className="min-w-0 text-sm">
                  به‌جای <span className="font-semibold">«{c.expected}»</span> زده‌ای{" "}
                  <span className="font-semibold text-destructive">«{c.chosen}»</span>
                </p>
                <div className="flex shrink-0 items-center gap-2.5 text-xs">
                  <span className="panel-num text-muted-foreground">{fa(c.times)} بار</span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
                    {c.area}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ⚠️ دو جنسِ خطا در «کیمیای وزن» دو مشکلِ کاملاً متفاوت‌اند و یک درصدِ کلی
 * یکی نشانشان می‌دهد:
 *   • ترتیب  → ارکان را می‌شناسد، چیدمانش اشتباه است.
 *   • ارکان  → اصلاً رکنِ درست را نشناخته.
 * تمرینِ لازم برای این دو یکی نیست، پس جمله صریح می‌گوید کدام غالب است.
 */
function ErrorShapeNote({ shape }: { shape: ErrorShape }) {
  const orderShare = Math.round((shape.orderOnly / shape.total) * 100);
  const orderDominant = shape.orderOnly > shape.footContent;

  return (
    <p className="panel-num mb-4 rounded-2xl border border-border/70 bg-background/45 p-3.5 text-[12.5px] leading-relaxed">
      در کیمیای وزن، از {fa(shape.total)} خطای تلاش اول، {fa(shape.orderOnly)} تا فقط{" "}
      <span className="font-semibold">ترتیب ارکان</span> بوده ({fa(orderShare)}٪) و{" "}
      {fa(shape.footContent)} تا <span className="font-semibold">خودِ ارکان</span>.{" "}
      {orderDominant
        ? "ارکان را می‌شناسی؛ تمرینت باید روی چیدمان باشد."
        : "پیش از چیدمان، خودِ ارکان را مرور کن."}
    </p>
  );
}
