"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { fa, relativeDay } from "@/lib/panel/format";
import type { PlusNotification } from "@/lib/plus/types";

/**
 * مرکزِ اعلان‌ها — زنگوله، شمارنده، فهرست.
 *
 * =============================================================================
 * ⚠️ یک مرکز، نه دو
 * =============================================================================
 *
 * اعلانِ پلاس، تأییدِ دبیری، بازخوردِ دبیر و عضویت در کلاس همه از یک جدول
 * می‌آیند و همه اینجا دیده می‌شوند. دو سیستمِ موازی یعنی کاربر باید دو جا
 * را نگاه کند و این شمارنده یکی‌شان را جا بیندازد — که بدتر از نداشتنِ
 * شمارنده است، چون به آدم می‌گوید «چیزی نیست».
 *
 * =============================================================================
 * ⚠️ سه حالتی که معمولاً جا می‌افتند
 * =============================================================================
 *
 *   • **خالی** — «اعلانی نداری» و نه یک کارتِ سفیدِ بی‌توضیح.
 *   • **خطا** — «نتوانستیم بخوانیم» با دکمهٔ تلاشِ دوباره. بدونِ این، یک
 *     قطعیِ شبکه دقیقاً شبیهِ «اعلانی نداری» دیده می‌شود.
 *   • **در حالِ خواندن** — چون فهرست صفحه‌بندی می‌شود و صفحهٔ دوم زمان
 *     می‌برد.
 */

type Page = {
  notifications: PlusNotification[];
  hasMore: boolean;
  unread: number;
  offset: number;
};

const KEY = ["panel", "notifications"] as const;

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<PlusNotification[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const result = await apiGet<Page>("/api/v1/notifications");
      if (!result.ok) throw new Error(result.errors.join(" "));
      /* صفحه‌های بارگذاری‌شده با هر بار تازه‌سازی از نو شروع می‌شوند —
         وگرنه ردیف‌های تکراری روی هم می‌نشستند. */
      setPages(result.data.notifications);
      setOffset(result.data.notifications.length);
      return result.data;
    },
    /* ⚠️ شمارنده باید بدونِ باز کردنِ زنگوله هم تازه بماند، ولی نه با
       هزینهٔ یک درخواست در هر ثانیه. یک دقیقه تعادلِ معقولی است. */
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const result = await apiPatch<{ marked: number }>("/api/v1/notifications", {});
      if (!result.ok) throw new Error(result.errors.join(" "));
      return result.data.marked;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiPatch<{ marked: number }>("/api/v1/notifications", { id });
      if (!result.ok) throw new Error(result.errors.join(" "));
      return id;
    },
    /* ⚠️ به‌روزرسانیِ خوش‌بینانهٔ محلی و بعد تازه‌سازی: کلیک روی یک اعلان
       باید همان لحظه اثر کند، وگرنه کاربر دوباره کلیک می‌کند. */
    onSuccess: (id) => {
      setPages((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await apiGet<Page>(`/api/v1/notifications?offset=${offset}`);
      if (result.ok) {
        setPages((prev) => {
          /* ⚠️ یکتاسازی با شناسه. صفحه‌بندی پایدار است (مرتب‌سازی شکنندهٔ
             تساوی دارد) ولی اگر بینِ دو درخواست اعلانِ تازه‌ای ساخته شود،
             یک ردیف می‌تواند جابه‌جا شود. */
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...result.data.notifications.filter((n) => !seen.has(n.id))];
        });
        setOffset((o) => o + result.data.notifications.length);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const unread = data?.unread ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `اعلان‌ها (${unread} خوانده‌نشده)` : "اعلان‌ها"}
        aria-expanded={open}
        className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell aria-hidden className="size-4.5" />
        {unread > 0 && (
          /* ⚠️ عددِ بزرگ در یک نشانِ کوچک جا نمی‌شود و نوار را می‌شکند. */
          <span className="panel-num absolute -top-1.5 -start-1.5 min-w-[1.25rem] rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {unread > 99 ? "۹۹+" : fa(unread)}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* پرده‌ای برای بستن با کلیکِ بیرون — روی لمس هم کار می‌کند. */}
          <button
            type="button"
            aria-label="بستن اعلان‌ها"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          {/* ⚠️ روی موبایل تمامِ عرض منهای حاشیه، روی دسکتاپ یک پنلِ ثابت.
              بدونِ `max-w`, این کارت روی گوشیِ ۳۶۰ پیکسلی از صفحه بیرون
              می‌زد. */}
          <div className="absolute end-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-[13px] font-bold">اعلان‌ها</h2>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="flex items-center gap-1 text-[12px] text-primary underline-offset-[6px] hover:underline disabled:opacity-50"
                >
                  <CheckCheck aria-hidden className="size-3.5" />
                  خواندنِ همه
                </button>
              )}
            </div>

            <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
              {isPending ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  <Loader2 aria-hidden className="mx-auto mb-2 size-4 animate-spin" />
                  در حال خواندن…
                </p>
              ) : isError ? (
                /* ⚠️ بدونِ این حالت، یک قطعیِ شبکه دقیقاً شبیهِ «اعلانی
                   نداری» دیده می‌شود — و کاربر هیچ‌وقت نمی‌فهمد چیزی را
                   از دست داده. */
                <div className="px-4 py-8 text-center text-[13px]">
                  <p className="text-muted-foreground">اعلان‌ها خوانده نشد.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-2 text-primary underline-offset-[6px] hover:underline"
                  >
                    تلاش دوباره
                  </button>
                </div>
              ) : pages.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                  هنوز اعلانی نداری.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {pages.map((n) => (
                    <li key={n.id}>
                      <NotificationRow
                        notification={n}
                        onRead={() => {
                          if (!n.readAt) markOne.mutate(n.id);
                        }}
                        onNavigate={() => setOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {hasMore && pages.length > 0 && (
                <div className="border-t border-border p-3">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full rounded-xl border border-border py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {loadingMore ? "در حال خواندن…" : "اعلان‌های قدیمی‌تر"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onRead,
  onNavigate,
}: {
  notification: PlusNotification;
  onRead: () => void;
  onNavigate: () => void;
}) {
  const unread = notification.readAt === null;

  const body = (
    <div className="flex items-start gap-2.5 px-4 py-3 text-right">
      {/* نقطهٔ «خوانده‌نشده» — رنگ به‌تنهایی کافی نیست، پس جایِ ثابت هم
          می‌گیرد تا فهرست نلرزد. */}
      <span
        aria-hidden
        className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] ${unread ? "font-semibold" : ""}`}>{notification.title}</p>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {relativeDay(notification.createdAt)}
          {unread && <span className="sr-only"> — خوانده نشده</span>}
        </p>
      </div>
    </div>
  );

  /* ⚠️ `href` از سرور می‌آید و CHECK دیتابیس تضمین می‌کند مسیرِ داخلی است
     (`^/[^/\\]`). پس یک اعلان نمی‌تواند کاربر را به بیرون بفرستد، حتی اگر
     روزی ردیفی از راهِ دیگری نوشته شود. */
  if (notification.href) {
    return (
      <Link
        href={notification.href}
        onClick={() => {
          onRead();
          onNavigate();
        }}
        className="block w-full transition-colors hover:bg-foreground/[0.03]"
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onRead}
      className="block w-full transition-colors hover:bg-foreground/[0.03]"
    >
      {body}
    </button>
  );
}
