import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import { RingRow } from "../skill/SkillMap";
import {
  TOPIC_GROUP_LABEL,
  TOPIC_STATUS_LABEL,
  type Topic,
  type TopicMap as TopicMapData,
} from "@/lib/plus/topics";

/**
 * نقشهٔ مبحث‌ها — ضعیف‌ترین اول.
 *
 * ⚠️ یک فهرستِ واحد و نه چهار کارتِ جدا به تفکیکِ بخش. پرسشِ دانش‌آموز
 * «در عروض چطورم؟» نیست، «الان وقتم را کجا بگذارم؟» است — و جوابِ آن یک
 * فهرستِ مرتب است. نامِ بخش روی هر سطر می‌آید تا بداند عدد از کجاست.
 *
 * ⚠️ مبحث‌های «خوب» داخلِ یک `<details>`اند و نه حذف‌شده: دیدنشان انگیزه
 * می‌دهد، ولی اگر بالای فهرست بنشینند صفحه سه برابر می‌شود و ضعف‌ها — که
 * کلِ دلیلِ وجودِ این صفحه‌اند — پایین می‌افتند. `<details>` هم خودِ مرورگر
 * است: بی‌جاوااسکریپت، با دسترس‌پذیریِ آماده.
 */
export default function TopicMap({ data }: { data: TopicMapData }) {
  const focus = data.topics.filter((t) => t.status !== "strong");

  return (
    <Card>
      <CardHeader>
        <CardTitle>نقشهٔ مبحث‌ها</CardTitle>
        <CardDescription>هر مبحثی که به حد سنجش رسیده، ضعیف‌ترین اول.</CardDescription>
      </CardHeader>

      <CardContent>
        {data.topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            هنوز هیچ مبحثی تمرین کافی ندارد. چند دور تمرین کن تا نقشه ساخته شود.
          </p>
        ) : (
          <>
            <p className="panel-num text-[12.5px] text-muted-foreground">
              {fa(data.weak.length)} مبحث ضعیف · {fa(data.strong.length)} مبحث خوب
              {data.pending > 0 && <> · {fa(data.pending)} مبحث هنوز تمرین کافی ندارد</>}
            </p>

            {focus.length > 0 && (
              <ul className="mt-2 grid gap-x-8 lg:grid-cols-2">
                {focus.map((t) => (
                  <TopicRow key={t.key} topic={t} />
                ))}
              </ul>
            )}

            {data.strong.length > 0 && (
              <details className="mt-4 border-t border-border/60 pt-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  مبحث‌های خوب ({fa(data.strong.length)})
                </summary>
                <ul className="mt-2 grid gap-x-8 lg:grid-cols-2">
                  {data.strong.map((t) => (
                    <TopicRow key={t.key} topic={t} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ⚠️ سه پله و نه طیفِ پیوسته — در فهرستی با پانزده سطر، طیف پانزده رنگِ
   کمی متفاوت می‌سازد که چشم دسته‌بندی‌شان نمی‌کند. */
const TONE: Record<Topic["status"], string> = {
  weak: "var(--destructive)",
  fair: "var(--gold)",
  strong: "var(--primary)",
};

/* ⚠️ `fa` روی برچسب لازم است: برچسبِ مبحث‌های واژگان شمارهٔ درس را در خودش
   دارد («درس ۵») و بدونِ آن، تنها رقمِ لاتینِ صفحه همان‌جا می‌نشست. `RingRow`
   خودش این کار را می‌کند. */
function TopicRow({ topic }: { topic: Topic }) {
  return (
    <RingRow
      label={topic.label}
      percent={Math.round(topic.accuracy * 100)}
      color={TONE[topic.status]}
      chip={TOPIC_STATUS_LABEL[topic.status]}
      // شفافیتِ منبع: کاربر باید بداند این عدد از کجا آمده.
      sub={`${TOPIC_GROUP_LABEL[topic.group]} · ${topic.detail}`}
    />
  );
}
