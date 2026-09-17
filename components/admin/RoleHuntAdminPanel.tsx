"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  RoleHuntAdminList,
  RoleHuntAdminTotals,
} from "@/lib/admin/role-hunt-actions";

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * پنلِ «شکار نقش‌ها».
 *
 * ⚠️ عمداً ویرایشگر نیست. این بازی بانکِ سؤالِ خودش را ندارد و هر دورش از
 * یک پرسشِ «مدارِ دستور» می‌آید؛ دلیلش بالای `lib/admin/role-hunt-actions.ts`
 * نوشته شده. پس اینجا فقط دو سؤال جواب داده می‌شود:
 *
 *   ۱) کدام مصراع‌ها به بازی می‌رسند، با چه نقشی و چه پاسخی؟
 *   ۲) کدام‌ها نمی‌رسند و **چرا**؟
 *
 * سؤالِ دوم مهم‌تر است. بدونش نویسنده‌ای که مصراعی نوشته و در بازی
 * نمی‌بیندش، هیچ راهی برای فهمیدنِ علت ندارد — و همان مصراع تا ابد
 * نامرئی می‌ماند.
 *
 * ⚠️ صافی‌ها روی *همان* داده‌ای کار می‌کنند که سرور یک بار فرستاده و هیچ
 * رفت‌وبرگشتِ تازه‌ای نمی‌سازند: کلِ بانکِ شعر چند صد ردیف است و
 * صفحه‌بندیِ سروری برای این اندازه فقط پیچیدگی اضافه می‌کرد.
 */
export default function RoleHuntAdminPanel({
  totals,
  data,
}: {
  totals: RoleHuntAdminTotals;
  data: RoleHuntAdminList;
}) {
  const [status, setStatus] = useState<"all" | "eligible" | "rejected">("all");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const needle = search.trim();
    return data.rows.filter((r) => {
      if (status === "eligible" && !r.eligible) return false;
      if (status === "rejected" && r.eligible) return false;
      if (role && r.roleKey !== role) return false;
      if (needle && !r.verse.includes(needle)) return false;
      return true;
    });
  }, [data.rows, status, role, search]);

  const rejectedTotal = Object.values(totals.rejected).reduce((a, b) => a + b, 0);

  return (
    <div dir="rtl" className="flex max-w-5xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">شکار نقش‌ها</h1>
          <Link
            href="/admin/games"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            ← بازی‌ها
          </Link>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          این بازی بانکِ سؤالِ جدا ندارد. هر دور از یک پرسشِ منتشرشدهٔ{" "}
          <Link href="/admin/games/grammar-circuit" className="text-primary hover:underline">
            مدار دستور
          </Link>{" "}
          ساخته می‌شود — همان مصراع، همان نقش‌های تأییدشده. برای ویرایشِ متن یا
          نقش‌ها، همان‌جا برو؛ اینجا فقط می‌بینی چه چیزی به بازی می‌رسد و چه
          چیزی نه.
        </p>
      </div>

      {totals.missingTable && (
        /* ⚠️ «جدول نیست» با «هنوز کسی بازی نکرده» یکی نیست. */
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          جدولِ <code>{totals.missingTable}</code> روی این دیتابیس ساخته نشده —
          مهاجرتِ ۰۱۷ اجرا نشده است. تا وقتی اجرا نشود، هیچ پاسخی ثبت نمی‌شود و
          این بازی در «برنامهٔ من» دیده نمی‌شود.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="مصراعِ منتشرشده" value={fa(totals.poetry)} />
        <Stat label="می‌رسد به بازی" value={fa(totals.eligible)} tone="primary" />
        <Stat label="نمی‌رسد" value={fa(rejectedTotal)} tone={rejectedTotal ? "gold" : undefined} />
        <Stat
          label="پاسخِ ثبت‌شده"
          value={totals.answers === null ? "—" : fa(totals.answers)}
        />
      </div>

      {rejectedTotal > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">چرا بعضی مصراع‌ها به بازی نمی‌رسند</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {(
              [
                ["no_unique_role", "هیچ نقشی فقط یک واژه ندارد"],
                ["too_many_words", "مصراع بلندتر از ظرفیتِ مدار"],
                ["too_few_words", "واژه‌های مصراع کم"],
                ["not_poetry", "جمله است و نه مصراع"],
              ] as const
            )
              .filter(([key]) => totals.rejected[key] > 0)
              .map(([key, label]) => (
                <li key={key} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <b className="panel-num">{fa(totals.rejected[key])}</b>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            رایج‌ترینش «نقشِ یکتا» است: اگر دو واژهٔ یک مصراع هر دو «صفت» باشند،
            پرسیدنِ «صفت کدام است؟» دو پاسخِ درست دارد و بازی بی‌معنی می‌شود. با
            دادنِ نقشِ دقیق‌تر به یکی از آن دو در «مدار دستور»، مصراع وارد بازی
            می‌شود.
          </p>
        </section>
      )}

      {data.byRole.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">توزیعِ نقش‌ها در بانک</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.byRole.map((r) => (
              <button
                key={r.roleKey}
                type="button"
                onClick={() => setRole(role === r.roleKey ? "" : r.roleKey)}
                aria-pressed={role === r.roleKey}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  role === r.roleKey
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {r.roleLabel} <span className="panel-num">{fa(r.count)}</span>
              </button>
            ))}
          </div>
          {/* ⚠️ توزیعِ نابرابر خودش یک سیگنالِ محتوایی است: نقشی که دو مصراع
              دارد، در تحلیلِ دانش‌آموز هیچ‌وقت به حدِ شواهد نمی‌رسد. */}
          <p className="mt-3 text-xs text-muted-foreground">
            نقشی که مصراعِ کمی دارد، در «برنامهٔ من» به حدِ شواهدِ لازم نمی‌رسد و
            تحلیلی برایش ساخته نمی‌شود.
          </p>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "همه"],
            ["eligible", "می‌رسد به بازی"],
            ["rejected", "نمی‌رسد"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جست‌وجو در مصراع…"
          aria-label="جست‌وجو در متنِ مصراع"
          className="min-w-40 flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        {(role || search || status !== "all") && (
          <button
            type="button"
            onClick={() => {
              setRole("");
              setSearch("");
              setStatus("all");
            }}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            پاک کردنِ صافی‌ها
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {fa(rows.length)} مصراع
        {data.total > data.rows.length && ` (از ${fa(data.total)} — فهرست کران دارد)`}
      </p>

      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.questionId}
            className="rounded-2xl border border-border bg-card p-4"
            data-eligible={r.eligible ? "true" : "false"}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* مصراع با نسخ، مثل همه‌جای دیگرِ سروا. */}
              <p className="panel-verse min-w-0 flex-1 text-base">{r.verse}</p>
              <Link
                href={`/admin/games/grammar-circuit?q=${r.questionId}`}
                className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
              >
                ویرایش در مدار دستور
              </Link>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {r.eligible ? (
                <>
                  <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-medium text-primary">
                    نقش: {r.roleLabel}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-0.5">
                    پاسخ: «{r.answer}»
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 font-medium text-gold">
                  {r.reasonLabel}
                </span>
              )}
              <span className="panel-num text-muted-foreground">{fa(r.words)} واژه</span>
              {r.grade && (
                <span className="panel-num text-muted-foreground">
                  {r.grade} · درس {fa(r.lesson ?? 0)}
                </span>
              )}
            </div>

            {r.detail && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.detail}</p>
            )}
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          با این صافی‌ها مصراعی نیست.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "gold";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div
        className={`panel-num text-2xl font-bold ${
          tone === "primary" ? "text-primary" : tone === "gold" ? "text-gold" : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
