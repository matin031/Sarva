import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import type { SkillAnalysis } from "@/lib/plus/analysis";

/**
 * تحلیلِ یک مهارت — وزن‌ها یا نقش‌های دستوری.
 *
 * ⚠️ نوارها با `scoreColor` رنگ نمی‌گیرند بلکه سه پله‌اند (ضعیف/متوسط/خوب)،
 * و این با کارت‌های صفحهٔ خانه فرق دارد و عمدی است: اینجا شش نوار کنارِ
 * هم‌اند و یک طیفِ پیوسته، شش رنگِ کمی متفاوت می‌سازد که چشم نمی‌تواند
 * دسته‌بندی‌شان کند. سه پله، سه دستهٔ خواندنی می‌دهد.
 */
export default function SkillBars({
  title,
  hint,
  analysis,
  emptyText,
}: {
  title: string;
  hint: string;
  analysis: SkillAnalysis;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>

      <CardContent>
        {!analysis.hasEnoughEvidence ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {analysis.buckets.slice(0, 6).map((bucket) => {
                const percent = Math.round(bucket.accuracy * 100);
                return (
                  <li key={bucket.key}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{bucket.label}</span>
                      <span className="panel-num text-xs text-muted-foreground">
                        {fa(bucket.correct)} از {fa(bucket.total)} — {fa(percent)}٪
                      </span>
                    </div>

                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-foreground/8"
                      role="img"
                      aria-label={`${bucket.label}: ${percent} درصد درست`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          percent < 50 ? "bg-destructive" : percent < 75 ? "bg-gold" : "bg-primary"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* شفافیتِ منبع: کاربر باید بداند این عدد از کجا آمده. */}
                    <p className="panel-num mt-1.5 text-[11.5px] text-muted-foreground/85">
                      {bucket.bySource
                        .map((s) => `${s.source}: ${fa(s.correct)}/${fa(s.total)}`)
                        .join(" • ")}
                    </p>
                  </li>
                );
              })}
            </ul>

            {analysis.ignoredBuckets > 0 && (
              <p className="panel-num mt-4 text-[11.5px] text-muted-foreground">
                {fa(analysis.ignoredBuckets)} مورد دیگر هنوز تمرینِ کافی ندارند و در این
                فهرست نیامده‌اند.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
