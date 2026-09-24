import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { AssignmentMeta, StatusChip } from "@/components/UI/panel/teacher/AssignmentList";
import type { AssignmentView } from "@/lib/teacher/assignments";

/**
 * تکالیف و آزمون‌هایی که دبیرها گذاشته‌اند — سمتِ دانش‌آموز.
 *
 * ⚠️ وضعیت از سرور می‌آید و نه از localStorage: همان «انجام‌شده» روی هر
 * دستگاه و پس از هر ورودِ دوباره.
 */
export default function StudentAssignments({ items }: { items: AssignmentView[] }) {
  if (items.length === 0) return null;

  return (
    <Card id="assignments" className="mt-4 scroll-mt-24">
      <CardHeader>
        <CardTitle>تکالیف</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold">{a.title}</span>
                  <StatusChip status={a.status} />
                </span>
                {a.teacherName && (
                  <span className="text-[12px] text-muted-foreground">از {a.teacherName}</span>
                )}
                <AssignmentMeta a={a} />
              </div>
              {a.status !== "done" && (
                <Link
                  href={a.href}
                  className="rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {a.status === "started" ? "ادامه" : "شروع"}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
