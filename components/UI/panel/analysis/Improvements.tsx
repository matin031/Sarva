import { ArrowDownLeft, ArrowUpLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import type { TopicDelta } from "@/lib/plus/topics";

/**
 * «چه چیزی بهتر شد؟» — دو هفتهٔ اخیر در برابرِ دو هفتهٔ پیش از آن.
 *
 * ⚠️ این بخش، حلقهٔ تحلیل را می‌بندد. نمودارِ هفتگی می‌گوید دقتِ *کلی* بالا
 * رفته، ولی دانش‌آموزی که یک هفته روی «مفاعیلن» کار کرده، دربارهٔ *مفاعیلن*
 * جواب می‌خواهد. بدونِ این، تمرین کردن یک کارِ بی‌بازخورد است.
 *
 * ⚠️ افت‌ها هم نشان داده می‌شوند و پنهان نمی‌شوند. صفحه‌ای که فقط خبرِ خوب
 * می‌دهد، دو هفته بعد سرِ آزمون رسوا می‌شود — و آن‌وقت کاربر به کلِ تحلیل
 * بی‌اعتماد می‌شود.
 */
export default function Improvements({ deltas }: { deltas: TopicDelta[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>چه چیزی بهتر شد؟</CardTitle>
        <CardDescription>دو هفتهٔ اخیر در برابر دو هفتهٔ پیش از آن.</CardDescription>
      </CardHeader>

      <CardContent>
        {deltas.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            برای مقایسه، یک مبحث باید در هر دو بازه تمرین شده باشد. چند دور دیگر روی
            مبحث‌های ضعیفت کار کن.
          </p>
        ) : (
          <ul className="flex flex-col">
            {deltas.slice(0, 6).map((d) => {
              const up = d.delta > 0;
              const flat = d.delta === 0;
              const Icon = up ? ArrowUpLeft : ArrowDownLeft;

              return (
                <li
                  key={d.key}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{d.label}</p>
                    <p className="panel-num mt-0.5 text-[11.5px] text-muted-foreground">
                      {fa(Math.round(d.before * 100))}٪ ({fa(d.beforeN)} تمرین) →{" "}
                      {fa(Math.round(d.after * 100))}٪ ({fa(d.afterN)} تمرین)
                    </p>
                  </div>

                  {flat ? (
                    <span className="panel-num shrink-0 text-xs text-muted-foreground">بدون تغییر</span>
                  ) : (
                    <span
                      className={`panel-num inline-flex shrink-0 items-center gap-1 text-sm font-bold ${
                        up ? "text-primary" : "text-destructive"
                      }`}
                    >
                      <Icon aria-hidden className="size-4" />
                      {fa(Math.abs(d.delta))} واحد
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
