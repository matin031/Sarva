"use client";

import Link from "next/link";
import type { RoleHuntSummary } from "@/lib/role-hunt/round";

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * پایانِ نشست.
 *
 * ⚠️ این صفحه عمداً *تحلیل* نیست و ادعایش را هم نمی‌کند. هشت دور برای
 * نتیجه‌گیری دربارهٔ یک مهارت کم است؛ چیزی که اینجا نوشته می‌شود گزارشِ
 * همین نشست است و نه حکم. تحلیلِ واقعی — روی همهٔ بازی‌ها و همهٔ تاریخچه —
 * در «برنامهٔ من» است و دکمهٔ پایین دقیقاً به همان‌جا می‌برد.
 *
 * ⚠️ و «ضعیف‌ترین نقش» اینجا نوشته نمی‌شود. فهرستِ پایین فقط می‌گوید در
 * کدام نقش‌ها اشتباهی *پیش آمد* — یک واقعیتِ همین نشست، نه یک برچسب.
 */
export default function RoleHuntResults({
  summary,
  onRestart,
}: {
  summary: RoleHuntSummary;
  onRestart: () => void;
}) {
  const accuracy = Math.round(summary.accuracy * 100);

  return (
    <div dir="rtl" className="mx-auto max-w-lg text-center">
      <h2 className="game-display text-2xl font-bold sm:text-3xl">
        {accuracy >= 80 ? "عالی بود!" : accuracy >= 50 ? "آفرین!" : "دورِ بعد بهتر"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        از {fa(summary.total)} نقشی که نشانت دادیم، {fa(summary.correct)} تا را درست شکار
        کردی.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="درست" value={fa(summary.correct)} />
        <Stat label="غلط" value={fa(summary.wrong)} />
        <Stat label="دقت" value={`${fa(accuracy)}٪`} />
        <Stat label="بهترین زنجیره" value={fa(summary.bestStreak)} />
      </div>

      {summary.weakRoles.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4 text-right">
          <h3 className="text-sm font-bold">نقش‌هایی که در این نشست اشتباه زدی</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {summary.weakRoles.map((role) => (
              <li
                key={role.roleKey}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-semibold">{role.roleLabel}</span>
                <span className="game-num text-xs text-muted-foreground">
                  {fa(role.wrong)} از {fa(role.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="game-display inline-flex min-h-11 items-center rounded-xl bg-primary px-7 text-base font-bold text-primary-foreground shadow-lg transition-all hover:brightness-95 active:scale-95"
        >
          یک دستِ دیگر
        </button>
        <Link
          href="/panel/analysis"
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition-all hover:border-primary hover:text-primary active:scale-95"
        >
          دیدن تحلیل من
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 px-3 py-4">
      <div className="game-num text-xl font-extrabold">{value}</div>
      <div className="mt-1 text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
