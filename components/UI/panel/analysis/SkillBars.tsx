import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import type { SkillAnalysis } from "@/lib/plus/analysis";
import { RingRow } from "../skill/SkillMap";

const TONE = [
  { label: "ضعیف", color: "var(--destructive)" },
  { label: "متوسط", color: "var(--gold)" },
  { label: "خوب", color: "var(--primary)" },
];

/**
 * تحلیلِ یک مهارت — وزن‌ها یا نقش‌های دستوری.
 *
 * ⚠️ حلقه‌ها با `scoreColor` رنگ نمی‌گیرند بلکه سه پله‌اند (ضعیف/متوسط/خوب)،
 * و این با کارت‌های صفحهٔ خانه فرق دارد و عمدی است: اینجا شش حلقه کنارِ
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
            <ul className="flex flex-col">
              {analysis.buckets.slice(0, 6).map((bucket) => {
                const percent = Math.round(bucket.accuracy * 100);
                const tone = TONE[percent < 50 ? 0 : percent < 75 ? 1 : 2];
                return (
                  <RingRow
                    key={bucket.key}
                    label={bucket.label}
                    percent={percent}
                    color={tone.color}
                    chip={tone.label}
                    /* شفافیتِ منبع: کاربر باید بداند این عدد از کجا آمده. */
                    sub={bucket.bySource.map((s) => `${s.source}: ${fa(s.correct)}/${fa(s.total)}`).join(" • ")}
                  />
                );
              })}
            </ul>

            {analysis.ignoredBuckets > 0 && (
              <p className="panel-num mt-4 text-[11.5px] text-muted-foreground">
                {fa(analysis.ignoredBuckets)} مورد دیگر هنوز تمرین کافی ندارند و در این
                فهرست نیامده‌اند.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
