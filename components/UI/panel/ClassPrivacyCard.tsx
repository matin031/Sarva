import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/UI/kit/card";
import { relativeDay } from "@/lib/panel/format";
import type { StudentViewEntry } from "@/lib/teacher/views";

/**
 * «دبیر چه چیزی از من می‌بیند؟»
 *
 * =============================================================================
 * ⚠️ چرا اینجا و نه در یک صفحهٔ «قوانین»
 * =============================================================================
 *
 * افشایی که در صفحهٔ شرایط و مقررات باشد، عملاً افشا نشده. این متن باید
 * دقیقاً کنارِ همان کلاس‌هایی باشد که دربارهٔ آن‌ها حرف می‌زند.
 *
 * ⚠️ و متن **دقیق** است و نه کلی. «دبیر فعالیت شما را می‌بیند» هم بیش از
 * واقعیت می‌گوید و هم کمتر: نوجوانی که آن را می‌خواند نمی‌داند خریدهایش هم
 * دیده می‌شود یا نه، و چون نمی‌داند، بدترین حالت را فرض می‌کند. پس هر دو
 * طرف نوشته می‌شود — آنچه دیده می‌شود و آنچه نمی‌شود.
 *
 * ⚠️ `<details>` و نه یک state در React: باز و بسته شدنش بدونِ جاوااسکریپت
 * هم کار می‌کند، صفحه‌خوان از خودش می‌داند که یک بخشِ جمع‌شده است، و
 * کیبورد بدونِ هیچ کدی کار می‌کند.
 */
export default function ClassPrivacyCard({ viewers }: { viewers: StudentViewEntry[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 text-[13px]">
        <p className="flex items-start gap-2 font-medium">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          دبیر هر کلاس می‌تواند عملکرد آموزشی شما در سروا را ببیند.
        </p>

        <details className="group">
          <summary className="cursor-pointer list-none text-primary underline-offset-[6px] hover:underline">
            <span className="group-open:hidden">دقیقاً چه چیزی؟</span>
            <span className="hidden group-open:inline">بستن</span>
          </summary>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-1.5 font-bold">
                <Eye aria-hidden className="size-4 text-primary" />
                می‌بیند
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-4 text-muted-foreground">
                <li>پاسخ‌ها و نتیجه‌های تمرین‌ها و بازی‌هایی که ثبت می‌شوند</li>
                <li>روند تمرین شما در طول زمان</li>
                <li>عملکرد عروض، نقش دستوری و آزمون‌ها، در حد داده‌ای که ثبت شده</li>
                <li>زمان آخرین فعالیت آموزشی</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-1.5 font-bold">
                <EyeOff aria-hidden className="size-4 text-muted-foreground" />
                نمی‌بیند
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-4 text-muted-foreground">
                <li>خریدها و صورتحساب</li>
                <li>پیام‌های پشتیبانی</li>
                <li>دستگاه‌ها و نشست‌های شما</li>
                <li>رمز و اطلاعات ورود</li>
                <li>کلاس‌های دیگری که عضوشان هستید</li>
              </ul>
            </div>
          </div>

          <p className="mt-3 text-muted-foreground">
            هر بار که دبیری عملکرد شما را باز کند، برایتان اعلان می‌آید و در فهرست پایین
            هم ثبت می‌شود.
          </p>
        </details>

        {/* ── چه کسانی دیده‌اند ────────────────────────────────────── */}
        {viewers.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <h2 className="font-bold">چه کسانی عملکرد شما را دیده‌اند</h2>
            {/* ⚠️ فقط تازه‌ترین بازدیدِ هر دبیر در هر کلاس — نه هر
                تازه‌سازی. فهرستی که بیست بار یک نام داشته باشد چیزی
                نمی‌گوید. (جمع‌بندی در `listMyViewers`.) */}
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {viewers.map((v) => (
                <li key={`${v.teacherName}-${v.className}-${v.viewedAt}`}>
                  {v.teacherName ?? "دبیر"} · کلاس {v.className} · {relativeDay(v.viewedAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
