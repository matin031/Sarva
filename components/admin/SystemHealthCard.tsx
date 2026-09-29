import Link from "next/link";
import type { SystemHealth } from "@/lib/admin/overview-actions";

const fa = (n: number) => n.toLocaleString("fa-IR");

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${fa(days)} روز و ${fa(hours)} ساعت`;
  if (hours > 0) return `${fa(hours)} ساعت و ${fa(minutes)} دقیقه`;
  return `${fa(minutes)} دقیقه`;
}

type Tone = "ok" | "warn" | "bad";

/** ⚠️ وضعیت با نشانه و متن هم گفته می‌شود، نه فقط با رنگ. */
function Dot({ tone }: { tone: Tone }) {
  const cls = tone === "ok" ? "bg-primary" : tone === "warn" ? "bg-gold" : "bg-destructive";
  const label = tone === "ok" ? "سالم" : tone === "warn" ? "هشدار" : "مشکل";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${cls}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * سلامتِ سیستم در یک کارت — اولین جایی که مدیر پیش از «چرا سایت کند است؟»
 * نگاه می‌کند.
 *
 * ⚠️ کامپوننتِ سروری و بدونِ state: عددها لحظهٔ بارِ صفحه‌اند و قرار نیست
 * زنده به‌روز شوند. رفرشِ صفحه همان کار را می‌کند.
 */
export default function SystemHealthCard({ health }: { health: SystemHealth }) {
  const rows: { label: string; value: string; tone: Tone; hint?: string; href?: string }[] = [
    {
      label: "دیتابیس",
      value: health.db.ok
        ? `${health.db.server ?? "متصل"} · ${fa(health.db.latencyMs ?? 0)} میلی‌ثانیه`
        : "در دسترس نیست",
      tone: !health.db.ok ? "bad" : (health.db.latencyMs ?? 0) > 200 ? "warn" : "ok",
      hint: health.db.sizeMb != null ? `حجم داده ${fa(health.db.sizeMb)} مگابایت` : undefined,
    },
    {
      label: "منطقهٔ زمانیِ تهران",
      value: health.db.tehranTz ? "بارگذاری شده" : "بارگذاری نشده",
      tone: health.db.tehranTz ? "ok" : "warn",
      hint: health.db.tehranTz ? undefined : "گزارش‌های روزانه خالی می‌مانند",
    },
    {
      label: "وضعیت سایت",
      value: health.maintenance ? "بسته (در حال بروزرسانی)" : "باز",
      tone: health.maintenance ? "warn" : "ok",
      href: "/admin/settings",
    },
    {
      label: "ایمیل",
      value: health.mailDriver === "smtp" ? "سرور SMTP" : health.mailDriver,
      tone: "ok",
      href: "/admin/settings",
    },
    {
      label: "پیامک",
      value: health.smsDriver === "mock" ? "غیرفعال (فقط ثبت در گزارش)" : health.smsDriver,
      tone: health.smsDriver === "mock" ? "warn" : "ok",
      href: "/admin/settings",
    },
    {
      label: "کاربرانِ واردشده",
      value: `${fa(health.activeSessions)} نشستِ فعال`,
      tone: "ok",
    },
    {
      label: "پرداختِ نیمه‌کاره (۲۴ ساعت)",
      value: fa(health.pendingOrders),
      tone: health.pendingOrders > 10 ? "warn" : "ok",
      href: "/admin/plus",
    },
    {
      label: "سرور",
      value: `Node ${health.node} · روشن از ${uptime(health.uptimeSeconds)} پیش`,
      tone: "ok",
      hint: health.release ? `نسخهٔ ${health.release}` : undefined,
    },
  ];

  const problems = rows.filter((r) => r.tone !== "ok").length;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">
          {problems === 0 ? "همه‌چیز سالم است" : `${fa(problems)} مورد نیاز به توجه دارد`}
        </span>
        <Dot tone={problems === 0 ? "ok" : rows.some((r) => r.tone === "bad") ? "bad" : "warn"} />
      </div>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {rows.map((r) => {
          const body = (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Dot tone={r.tone} />
                {r.label}
              </div>
              <div className="mt-0.5 text-sm" dir="auto">
                {r.value}
                {r.hint && <span className="block text-[11px] text-muted-foreground">{r.hint}</span>}
              </div>
            </>
          );
          return r.href ? (
            <Link
              key={r.label}
              href={r.href}
              className="border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/30"
            >
              {body}
            </Link>
          ) : (
            <div key={r.label} className="border-b border-border px-4 py-3 last:border-0">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
