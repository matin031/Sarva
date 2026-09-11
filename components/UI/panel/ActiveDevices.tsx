"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LaptopMinimal, LogOut } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { apiDelete, apiGet } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { fa } from "@/lib/panel/format";
import type { DeviceRow } from "@/lib/auth/devices";

/**
 * دستگاه‌هایی که با این حساب وارد شده‌اند.
 *
 * انگیزه‌اش عملی است: دانش‌آموزی که روی رایانهٔ مدرسه یا گوشیِ دوستش وارد
 * مانده، باید بتواند ببیندش و ببنددش — بدونِ عوض کردنِ رمز.
 *
 * ⚠️ **این تنها جای پنل است که TanStack Query واقعاً کار می‌کند**، و دلیلش
 * دقیقاً همین‌جاست: فهرست بعد از «خروج از همه» عوض می‌شود. نسخهٔ قبلی این
 * را دستی اداره می‌کرد — یک `useState` برای فهرست، یک `reload()` دستی، و
 * چهار state برای busy/error/message. حالا سرور منبعِ حقیقت است و
 * `invalidateQueries` کارِ هر چهارتا را می‌کند.
 *
 * ⚠️ و `initialData` یعنی همچنان **بدونِ اسپینر** شروع می‌شود: فهرستِ اول از
 * رندرِ سرور می‌آید، نه از یک رفت‌وبرگشتِ اضافه بعد از hydration.
 */

function relative(iso: string | null): string {
  if (!iso) return "—";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "همین الان";
  if (min < 60) return `${fa(min)} دقیقه پیش`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${fa(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${fa(days)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

const DEVICES_KEY = ["panel", "devices"] as const;

export default function ActiveDevices({ initial }: { initial: DeviceRow[] }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: DEVICES_KEY,
    queryFn: async () => {
      const result = await apiGet<{ sessions: DeviceRow[] }>("/api/v1/auth/sessions");
      if (!result.ok) throw new Error(result.errors.join(" "));
      return result.data.sessions;
    },
    initialData: initial,
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      const result = await apiDelete<{ revoked: number }>("/api/v1/auth/sessions");
      if (!result.ok) throw new Error(result.errors.join(" "));
      return result.data.revoked;
    },
    onSuccess: (revoked) => {
      // سرور بلافاصله یک سشنِ تازه برای همین مرورگر می‌سازد، پس کاربر بیرون
      // نمی‌افتد — ولی فهرست باید از نو خوانده شود.
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY });
      const others = Math.max(0, revoked - 1);
      setMessage(
        others > 0
          ? `${fa(others)} دستگاه دیگر خارج شد. خودت وارد مانده‌ای.`
          : "دستگاه دیگری وارد نبود.",
      );
    },
  });

  return (
    <Card data-tone="mint">
      <CardHeader>
        <CardTitle>دستگاه‌های وارد شده</CardTitle>
        <CardDescription>
          اگر دستگاهی را نمی‌شناسی، از همه خارج شو و رمزت را عوض کن.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">دستگاه فعالی پیدا نشد.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  s.current ? "border-primary/35 bg-primary/6" : "border-border/70",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    s.current ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
                  )}
                >
                  <LaptopMinimal className="size-4.5" strokeWidth={1.7} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {s.device}
                    {s.current && (
                      <span className="rounded-full bg-primary/15 px-2 text-[11px] text-primary">
                        همین دستگاه
                      </span>
                    )}
                  </p>
                  <p className="panel-num mt-0.5 text-xs text-muted-foreground">
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
        {revokeAll.isError && (
          <p role="alert" className="text-sm text-destructive">
            {revokeAll.error.message}
          </p>
        )}

        {sessions.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={revokeAll.isPending}
            onClick={() => setConfirming(true)}
            className="self-start border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10"
          >
            <LogOut aria-hidden />
            {revokeAll.isPending ? "در حال خروج…" : "خروج از همهٔ دستگاه‌های دیگر"}
          </Button>
        )}

        <ConfirmDialog
          open={confirming}
          title="خروج از همهٔ دستگاه‌ها"
          body="همهٔ دستگاه‌هایی که با حساب تو وارد شده‌اند خارج می‌شوند."
          consequence="خودت وارد می‌مانی و لازم نیست دوباره رمز بزنی."
          confirmLabel="از همه خارج شو"
          onConfirm={() => {
            setConfirming(false);
            setMessage(null);
            revokeAll.mutate();
          }}
          onCancel={() => setConfirming(false)}
        />
      </CardContent>
    </Card>
  );
}
