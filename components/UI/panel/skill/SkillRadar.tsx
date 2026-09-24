"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { MIN_EVIDENCE_PER_BUCKET } from "@/lib/plus/skill-buckets";
import { fa } from "@/lib/panel/format";
import type { SkillTile } from "@/lib/panel/skills";

/**
 * نیم‌رخِ مهارت‌ها در یک نگاه — کجا پر است و کجا فرورفته.
 *
 * ⚠️ فقط مهارت‌هایی که به کمینهٔ شواهد رسیده‌اند. محورِ «صفر» برای نقشی که
 * هنوز تمرین نشده، فرورفتگی‌ای می‌کشد که ضعف نیست. زیرِ سه محور هم رادار
 * شکلی ندارد و چیزی کشیده نمی‌شود.
 */
export default function SkillRadar({ tiles, color = "var(--primary)" }: { tiles: SkillTile[]; color?: string }) {
  const data = tiles
    .filter((t) => t.total >= MIN_EVIDENCE_PER_BUCKET)
    .map((t) => ({ label: t.label, value: Math.round((t.correct / t.total) * 100) }));

  if (data.length < 3) {
    return (
      <p className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
        نمودار بعد از تمرینِ دست‌کم سه مورد ساخته می‌شود.
      </p>
    );
  }

  return (
    /* ⚠️ `dir="ltr"`: Recharts برچسبِ هر محور را با `text-anchor` برای چپ‌به‌راست
       می‌چیند. زیرِ صفحهٔ راست‌به‌چپ start و end جابه‌جا می‌شوند و برچسب‌های
       دو طرف روی خودِ نمودار می‌افتادند. */
    <div dir="ltr" className="h-64 w-full sm:h-72" role="img" aria-label={data.map((d) => `${d.label} ${d.value}٪`).join("، ")}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%" margin={{ top: 8, right: 36, bottom: 8, left: 36 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 12.5, fill: "var(--foreground)" }}
            // RLI … PDI: برچسبِ فارسی داخلِ SVGِ چپ‌به‌راست، بی‌آنکه «٪» به آن سرش بپرد.
            tickFormatter={(label: string) => `\u2067${label} ${fa(data.find((d) => d.label === label)?.value ?? 0)}٪\u2069`}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.22}
            dot={{ r: 3, fill: color }}
            animationDuration={900}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
