"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { fa, jalali, relativeDay } from "@/lib/panel/format";
import { useReducedMotion } from "@/lib/perf/use-perf";
import { cn } from "@/lib/cn";
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
 *
 * =============================================================================
 * ⚠️ و سه چیزی که با «زیاد شدنِ اعلان‌ها» اضافه شد
 * =============================================================================
 *
 * ۱. **اسکلتِ کارت ثابت است.** سرتیتر و پاورقی *بیرونِ* ناحیهٔ اسکرول‌اند.
 *    پیش از این دکمهٔ «اعلان‌های قدیمی‌تر» داخلِ همان ناحیه بود، یعنی با هر
 *    بار فشردنش پایین‌تر می‌رفت و کاربر باید دنبالش می‌گشت.
 *
 * ۲. **گروه‌بندیِ روزانه.** یک فهرستِ شصت‌ردیفیِ یکدست قابلِ پیمایش نیست.
 *    سرتیترِ چسبانِ «امروز / دیروز / …» موقعِ اسکرول می‌گوید کجاییم.
 *
 * ۳. **سقفِ بارگذاری.** هر «قدیمی‌تر» بیست ردیف اضافه می‌کند و بدونِ سقف،
 *    کاربری که ده بار بزند سیصد ردیف در حافظه و در DOM دارد — روی موبایل
 *    کاملاً محسوس. سقف صریح است و پاورقی هم می‌گوید چرا ایستاده.
 */

type Page = {
  notifications: PlusNotification[];
  hasMore: boolean;
  unread: number;
  offset: number;
};

const KEY = ["panel", "notifications"] as const;

/**
 * بیشترین اعلانی که همزمان در کارت می‌ماند.
 *
 * ⚠️ سه صفحه. عددِ بزرگ‌تر فقط DOM را سنگین می‌کند: کسی که دنبالِ اعلانی از
 * دو ماه پیش است، با فشردنِ پیاپیِ یک دکمه پیدایش نمی‌کند — آن کار یک
 * صفحهٔ جدا با جست‌وجو می‌خواهد و نه یک فهرستِ بلندتر.
 */
const MAX_LOADED = 60;

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
    /* ⚠️ اینجا هم به‌روزرسانیِ محلی و بعد تازه‌سازی، مثلِ `markOne`.
       بدونِ آن، بینِ پاسخِ سرور و رسیدنِ کوئریِ تازه، همهٔ ردیف‌ها هنوز
       «خوانده‌نشده» دیده می‌شدند و کاربر دوباره روی دکمه می‌زد. */
    onSuccess: () => {
      const now = new Date().toISOString();
      setPages((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
      queryClient.invalidateQueries({ queryKey: KEY });
    },
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
  const atCap = pages.length >= MAX_LOADED;

  /* ⚠️ گروه‌بندی بر اساسِ *برچسبِ* روز و نه خودِ تاریخ.

     `relativeDay` برای هر چیزِ قدیمی‌تر از یک ماه، تاریخِ کاملِ شمسی
     می‌دهد — پس گروه‌ها خودبه‌خود «امروز»، «دیروز»، «۳ روز پیش»، و بعد
     تاریخ‌های جدا می‌شوند، بی‌آنکه قاعدهٔ دومی لازم باشد.

     ترتیب از خودِ فهرست می‌آید (تازه‌ترین اول) و `Map` آن را نگه می‌دارد. */
  const groups = useMemo(() => {
    const map = new Map<string, PlusNotification[]>();
    for (const item of pages) {
      const label = relativeDay(item.createdAt);
      const bucket = map.get(label);
      if (bucket) bucket.push(item);
      else map.set(label, [item]);
    }
    return [...map.entries()];
  }, [pages]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `اعلان‌ها (${unread} خوانده‌نشده)` : "اعلان‌ها"}
        aria-expanded={open}
        className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              می‌زد.

              ⚠️ و `flex-col`: سرتیتر و پاورقی ارتفاعِ خودشان را می‌گیرند و
              فقط فهرست کشیده می‌شود. پیش از این همه‌چیز در یک جریان بود و
              دکمهٔ «قدیمی‌تر» با هر بارگذاری پایین‌تر می‌رفت. */}
          <div className="absolute end-0 z-50 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold">
                اعلان‌ها
                {unread > 0 && (
                  <span className="panel-num rounded-full bg-primary/12 px-1.5 text-[11px] font-bold text-primary">
                    {fa(unread)}
                  </span>
                )}
              </h2>
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

            <div className="sarva-scroll max-h-[min(28rem,70vh)] flex-1 overflow-y-auto overscroll-contain">
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
                groups.map(([label, items]) => (
                  <section key={label}>
                    {/* ⚠️ `sticky` روی سرتیترِ روز: در فهرستِ شصت‌ردیفی،
                        همیشه معلوم است که اعلانِ زیرِ دست مالِ چه روزی
                        است — بی‌آنکه لازم باشد کاربر تا بالا اسکرول کند. */}
                    <h3 className="sticky top-0 z-10 border-b border-border/60 bg-surface/95 px-4 py-1.5 text-[11px] font-bold text-muted-foreground backdrop-blur-sm">
                      {label}
                    </h3>
                    <ul className="flex flex-col divide-y divide-border">
                      {items.map((n) => (
                        <li key={n.id}>
                          <NotificationRow
                            notification={n}
                            pending={markOne.isPending && markOne.variables === n.id}
                            onRead={() => {
                              if (!n.readAt) markOne.mutate(n.id);
                            }}
                            onNavigate={() => setOpen(false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            {/* ── پاورقی: بیرونِ ناحیهٔ اسکرول ────────────────────────── */}
            {pages.length > 0 && (hasMore || atCap) && (
              <div className="shrink-0 border-t border-border p-3">
                {atCap ? (
                  /* ⚠️ صریح می‌گوید چرا ایستاده. یک دکمهٔ غیرفعالِ
                     بی‌توضیح، خواننده را به این نتیجه می‌رساند که چیزی
                     خراب است. */
                  <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
                    {fa(MAX_LOADED)} اعلانِ اخیر نشان داده شد. برای دیدنِ قدیمی‌ترها،
                    اول همین‌ها را خوانده‌شده کن.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full rounded-xl border border-border py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {loadingMore ? "در حال خواندن…" : "اعلان‌های قدیمی‌تر"}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  pending,
  onRead,
  onNavigate,
}: {
  notification: PlusNotification;
  /** درخواستِ «خوانده شد» برای همین ردیف در راه است. */
  pending: boolean;
  onRead: () => void;
  onNavigate: () => void;
}) {
  const unread = notification.readAt === null;

  const body = (
    <div className="flex items-start gap-2.5 py-3 pe-2 ps-4 text-right">
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
          <time dateTime={notification.createdAt} title={jalali(notification.createdAt)}>
            {relativeDay(notification.createdAt)}
          </time>
          {unread && <span className="sr-only"> — خوانده نشده</span>}
        </p>
      </div>
    </div>
  );

  /* ⚠️ دکمهٔ تیک **کنارِ** لینک می‌نشیند و نه داخلش.

     یک `<button>` داخلِ یک `<a>` هم HTMLِ نامعتبر است و هم در عمل خراب:
     کلیک روی دکمه لینک را هم فعال می‌کند، پس «خوانده شد» زدن کاربر را از
     پنل بیرون می‌برد. به همین دلیل ردیف یک `flex` است با دو فرزندِ خواهر. */
  return (
    <div className="flex items-stretch transition-colors hover:bg-foreground/[0.03]">
      {notification.href ? (
        <Link
          href={notification.href}
          onClick={() => {
            onRead();
            onNavigate();
          }}
          className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRead}
          className="min-w-0 flex-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {body}
        </button>
      )}

      {unread && (
        <MarkReadButton
          pending={pending}
          onClick={onRead}
          label={`«${notification.title}» را خوانده‌شده کن`}
        />
      )}
    </div>
  );
}

/**
 * دکمهٔ «خوانده شد» — یک تیکِ گِرد که کشیده می‌شود.
 *
 * ⚠️ چرا انیمیشن اینجا کارِ تزئین نیست: این دکمه چیزی را عوض می‌کند که
 * *خودش* بلافاصله ناپدید می‌شود (ردیف خوانده می‌شود و دکمه می‌رود). بدونِ
 * یک لحظه بازخورد، کاربر نمی‌داند کلیکش گرفت یا لغزید — و دوباره می‌زند،
 * این بار روی ردیفِ دیگری که بالا آمده.
 *
 * ⚠️ `pathLength` و نه `opacity`: تیک *کشیده* می‌شود، پس چشم مسیرِ حرکت را
 * دنبال می‌کند و می‌فهمد چه اتفاقی افتاد. یک محوشدنِ ساده همان اطلاعات را
 * نمی‌دهد.
 *
 * ⚠️ و `useReducedMotion` جدی گرفته می‌شود: با آن روشن، تیک بدونِ هیچ
 * حرکتی می‌آید. حذفِ کلِ بازخورد غلط بود — کاربری که حرکت را خاموش کرده،
 * نخواسته «ندانم چه شد».
 */
function MarkReadButton({
  pending,
  onClick,
  label,
}: {
  pending: boolean;
  onClick: () => void;
  label: string;
}) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "group/mark my-auto me-2 grid size-7 shrink-0 place-items-center rounded-full",
        "border border-border/70 text-muted-foreground",
        "transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-default disabled:opacity-60",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {pending ? (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.12 }}
          >
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          </motion.span>
        ) : (
          <motion.svg
            key="check"
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
            initial={{ scale: reduced ? 1 : 0.6 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            /* فنرِ کوتاه و بی‌پرش — دکمه باید سریع به نظر برسد و نه بازیگوش. */
            transition={{ type: "spring", stiffness: 520, damping: 26 }}
            whileTap={reduced ? undefined : { scale: 0.85 }}
          >
            <motion.path
              d="M4.5 12.5 9.5 17.5 19.5 6.5"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
