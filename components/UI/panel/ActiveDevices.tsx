"use client";

import { useState } from "react";
import { apiDelete, apiGet } from "@/lib/api/client";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { DeviceRow } from "@/lib/auth/devices";

/**
 * دستگاه‌هایی که با این حساب وارد شده‌اند.
 *
 * انگیزه‌اش عملی است: دانش‌آموزی که روی رایانهٔ مدرسه یا گوشی دوستش لاگین
 * مانده، تا امروز هیچ راهی برای بستن آن نداشت — نه می‌توانست ببیندش و نه
 * ببنددش. تنها راه، عوض کردن رمز بود، که کارِ درستی است ولی نباید تنها راه
 * باشد.
 *
 * سمت سرور `listActiveSessions` از ابتدا وجود داشت و استفاده نمی‌شد.
 *
 * فهرست اول از سرور می‌آید (`initial`) و نه از یک fetch در useEffect — همان
 * الگویی که بقیهٔ صفحه‌های پنل دارند. یعنی داده در همان رندر اول حاضر است، بدون
 * «در حال بارگذاری…» و بدون یک رفت‌وبرگشت اضافه.
 */

function relative(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "همین الان";
  if (min < 60) return `${min.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days.toLocaleString("fa-IR")} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

export default function ActiveDevices({ initial }: { initial: DeviceRow[] }) {
  const [sessions, setSessions] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  // فقط بعد از «خروج از همه» صدا زده می‌شود — نه در زمان mount.
  const reload = async () => {
    const result = await apiGet<{ sessions: DeviceRow[] }>("/api/v1/auth/sessions");
    if (result.ok) setSessions(result.data.sessions);
  };

  const revokeAll = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await apiDelete<{ revoked: number }>("/api/v1/auth/sessions");
    setBusy(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }

    // سرور بلافاصله یک سشن تازه برای همین مرورگر ساخته، پس کاربر بیرون
    // نمی‌افتد — ولی فهرست باید از نو خوانده شود تا ردیف‌های بسته‌شده بروند.
    await reload();
    const others = Math.max(0, result.data.revoked - 1);
    setMessage(
      others > 0
        ? `${others.toLocaleString("fa-IR")} دستگاه دیگر خارج شد. خودت وارد مانده‌ای.`
        : "دستگاه دیگری وارد نبود.",
    );
  };

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <h3 className="font-semibold">دستگاه‌های وارد شده</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          هر جایی که با حساب خودت وارد شده‌ای. اگر چیزی را نمی‌شناسی، از همه خارج شو و رمزت را
          عوض کن.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">دستگاه فعالی پیدا نشد.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                s.current ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {s.device}
                  {s.current && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                      همین دستگاه
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  آخرین فعالیت {relative(s.lastUsedAt ?? s.createdAt)}
                  {s.ip && (
                    <>
                      {" · "}
                      <span dir="ltr">{s.ip}</span>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {sessions.length > 1 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="min-h-11 self-start rounded-xl border border-destructive/40 px-5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        >
          {busy ? "در حال خروج…" : "خروج از همهٔ دستگاه‌های دیگر"}
        </button>
      )}

      <ConfirmDialog
        open={confirming}
        title="خروج از همهٔ دستگاه‌ها"
        body="همهٔ دستگاه‌هایی که با حساب تو وارد شده‌اند خارج می‌شوند."
        consequence="خودت وارد می‌مانی و لازم نیست دوباره رمز بزنی."
        confirmLabel="از همه خارج شو"
        onConfirm={revokeAll}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
