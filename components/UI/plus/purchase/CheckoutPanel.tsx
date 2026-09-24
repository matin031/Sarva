"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowLeft, Check, Loader2, ShieldCheck, Zap } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { formatRials, formatRialsAmountOnly } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import type { PlusOrderSummary } from "@/lib/plus/types";
import MainLogo from "@/components/svgs/mainLogo";
import { useBfcacheReset } from "./use-bfcache-reset";
import css from "./checkout.module.css";

export type CheckoutOffer = {
  code: string;
  title: string;
  subtitle: string | null;
  durationDays: number;
  amountRials: number;
  compareAtRials: number | null;
  discountPercent: number | null;
  savingPercent: number | null;
  /** پایانِ اعتبار اگر همین حالا پرداخت شود — روی سرور حساب شده. */
  accessUntil: string;
};

/**
 * انتخابِ مدت + خلاصهٔ خرید + دکمهٔ پرداخت.
 *
 * ⚠️ مبلغ اینجا فقط *نمایش* است. تنها چیزی که به سرور می‌رود `planCode`
 * است؛ سرور مبلغ را از `plus_plan_versions` می‌خواند.
 *
 * ⚠️ دو محافظت در برابر دوبار پرداخت، و هیچ‌کدام به‌تنهایی کافی نیست:
 * `busy` فقط جلوی دوبار کلیکِ تصادفی را می‌گیرد؛ محافظتِ واقعی ایندکسِ
 * «یک سفارشِ باز برای هر پلن» در دیتابیس است.
 */
export default function CheckoutPanel({
  offers,
  initialCode,
  account,
  accountLtr,
  holder,
  activeUntil,
  blockedReason,
  isTestGateway,
}: {
  offers: CheckoutOffer[];
  initialCode: string;
  account: string;
  accountLtr: boolean;
  /** نامی که روی کارتِ عضویت نوشته می‌شود. */
  holder: string;
  /** اشتراکِ فعلیِ کاربر تا کِی است — برای پیامِ تمدید. null یعنی ندارد. */
  activeUntil: string | null;
  /** اگر پرداخت ممکن نیست، دلیلش. دکمه جایش را به این پیام می‌دهد. */
  blockedReason: string | null;
  isTestGateway: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());

  const selected = offers.find((o) => o.code === code) ?? offers[0];

  useBfcacheReset(useCallback(() => setBusy(false), []));

  /** کلیدِ idempotency برای هر پلن جدا، و ساخته‌شده هنگامِ کلیک. */
  function keyFor(planCode: string): string {
    let key = keys.current.get(planCode);
    if (!key) {
      key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
      keys.current.set(planCode, key);
    }
    return key;
  }

  function choose(next: string) {
    if (busy || next === code) return;
    setCode(next);
    setError(null);
    // انتخاب در آدرس می‌ماند: رفرش یا برگشت از درگاه همان پلن را نشان می‌دهد.
    router.replace(`/checkout?plan=${encodeURIComponent(next)}`, { scroll: false });
  }

  async function pay() {
    if (busy || !selected) return;
    setBusy(true);
    setError(null);

    const created = await apiPost<{ order: PlusOrderSummary }>("/api/v1/plus/checkout", {
      planCode: selected.code,
      idempotencyKey: keyFor(selected.code),
    });
    if (!created.ok) {
      setError(created.errors.join("\n"));
      setBusy(false);
      return;
    }

    const started = await apiPost<{ redirectUrl: string }>(
      `/api/v1/plus/orders/${created.data.order.id}/pay`,
    );
    if (!started.ok) {
      setError(started.errors.join("\n"));
      setBusy(false);
      // قیمت یا پلن ممکن است همین حالا عوض شده باشد؛ صفحه از سرور تازه شود.
      router.refresh();
      return;
    }

    /* ⚠️ `assign` و نه `replace`: کاربر باید بتواند با back از درگاه برگردد.
       برگشتنش سفارشِ دومی نمی‌سازد — همان سفارشِ باز برگردانده می‌شود. */
    window.location.assign(started.data.redirectUrl);
  }

  if (!selected) return null;

  return (
    <div>
      <MemberCard
        holder={holder}
        account={account}
        accountLtr={accountLtr}
        planTitle={selected.title}
        until={jalaliLong(selected.accessUntil)}
        planKey={selected.code}
      />

      {/* ── انتخاب مدت ───────────────────────────────────────────── */}
      <fieldset className="mt-4" disabled={busy}>
        <legend className="sr-only">مدت اشتراک</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 sm:gap-4">
          {offers.map((offer, index) => {
            const on = offer.code === selected.code;
            const perDay = Math.round(offer.amountRials / offer.durationDays / 10) * 10;
            return (
              <motion.label
                key={offer.code}
                data-on={on}
                initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.25 + 0.07 * index, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                onPointerMove={spotlight}
                className={`${css.tile} flex cursor-pointer flex-col p-4`}
              >
                {on && <span aria-hidden className={css.ring} />}
                <input
                  type="radio"
                  name="plan"
                  value={offer.code}
                  checked={on}
                  onChange={() => choose(offer.code)}
                  className="peer sr-only"
                />

                <span className="flex min-h-6 items-start justify-between gap-2">
                  {offer.discountPercent !== null ? (
                    <Badge>{fa(offer.discountPercent)}٪ تخفیف</Badge>
                  ) : offer.savingPercent !== null && offer.savingPercent >= 10 ? (
                    <Badge>به‌صرفه‌تر</Badge>
                  ) : (
                    <span />
                  )}
                  <span
                    aria-hidden
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 peer-focus-visible:ring-4 peer-focus-visible:ring-primary/30 ${
                      on
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_65%,transparent)]"
                        : "border-foreground/20"
                    }`}
                  >
                    <AnimatePresence>
                      {on && (
                        <motion.span
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        >
                          <Check className="size-3.5" strokeWidth={3.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </span>

                <span className="mt-3 text-sm font-bold">{offer.title}</span>

                <span className="mt-2 flex items-baseline gap-1.5">
                  <span className={`text-[1.75rem] font-black leading-none tracking-tight ${on ? "text-primary" : ""}`}>
                    {formatRialsAmountOnly(offer.amountRials)}
                  </span>
                  <span className="text-xs text-muted-foreground">تومان</span>
                </span>

                <span className="mt-1.5 text-xs text-muted-foreground">
                  {offer.compareAtRials !== null ? (
                    <span className="line-through">{formatRials(offer.compareAtRials)}</span>
                  ) : (
                    <>روزی {formatRials(perDay)}</>
                  )}
                </span>

                <span className="mt-auto pt-3 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground/80">{fa(offer.durationDays)} روز</span>
                  {offer.subtitle ? ` • ${offer.subtitle}` : ""}
                </span>
              </motion.label>
            );
          })}
        </div>
      </fieldset>

      {activeUntil && (
        <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-center text-xs leading-relaxed plus-ink">
          اشتراک فعلی‌ات تا {jalaliLong(activeUntil)} اعتبار دارد. این خرید به انتهای آن اضافه می‌شود.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-primary" />
          {isTestGateway ? "درگاه آزمایشی — پولی جابه‌جا نمی‌شود" : "پرداخت امن از درگاه بانکی"}
        </span>
        <span className="flex items-center gap-1.5">
          <Zap aria-hidden className="size-4 plus-ink" />
          فعال‌سازی فوری بعد از پرداخت
        </span>
      </div>

      {/* ── نوارِ پرداخت ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 26 }}
        className="sticky bottom-4 z-30 mx-auto mt-8 max-w-2xl"
      >
        <div className={`${css.dock} rounded-[1.75rem] p-2.5`}>
          {error && (
            <p
              role="alert"
              className="mb-2.5 whitespace-pre-line rounded-2xl bg-destructive/10 px-4 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 ps-2 sm:ps-3">
              <p className="truncate text-[11px] text-muted-foreground">
                {selected.title} • {fa(selected.durationDays)} روز
              </p>
              <p className="whitespace-nowrap text-xl font-black tracking-tight sm:text-2xl">
                <AnimatedPrice rials={selected.amountRials} />
              </p>
            </div>

            {blockedReason ? (
              <p className="max-w-[60%] rounded-2xl bg-foreground/[0.05] px-4 py-3 text-center text-xs text-muted-foreground sm:max-w-xs sm:text-sm">
                {blockedReason}
              </p>
            ) : (
              <button
                type="button"
                onClick={pay}
                disabled={busy}
                aria-busy={busy}
                className={`${css.pay} flex shrink-0 items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3.5 text-sm font-extrabold disabled:cursor-wait disabled:opacity-80 sm:px-8 sm:py-4 sm:text-base`}
              >
                {busy ? (
                  <>
                    <Loader2 aria-hidden className="size-5 animate-spin" />
                    <span className="sm:hidden">انتقال…</span>
                    <span className="hidden sm:inline">در حال انتقال به درگاه…</span>
                  </>
                ) : (
                  <>
                    پرداخت<span className="hidden sm:inline"> و فعال‌سازی</span>
                    <ArrowLeft aria-hidden className={`${css.arrow} size-5`} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** نورِ کاشی دنبالِ نشانگر — مستقیم روی CSS، بدونِ رندرِ React. */
function spotlight(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold plus-ink ring-1 ring-gold/40">
      {children}
    </span>
  );
}

/** مبلغ با شمارشِ نرم بین دو پلن. همیشه روی تومانِ صحیح گرد می‌شود. */
function AnimatedPrice({ rials }: { rials: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(rials, { stiffness: 140, damping: 22 });
  const text = useTransform(spring, (v) => formatRials(Math.round(v / 10) * 10));
  useEffect(() => {
    if (reduce) spring.jump(rials);
    else spring.set(rials);
  }, [rials, reduce, spring]);
  return <motion.span>{text}</motion.span>;
}

/**
 * کارتِ عضویتِ شیشه‌ای. لوگوی سروا پشتِ کارت است: جایی که زیرِ شیشه است
 * تار دیده می‌شود و جایی که بیرون می‌زند تیز. با نشانگر، کارت کج می‌شود و
 * لوگو خلافِ آن جابه‌جا می‌شود تا عمق حس شود.
 *
 * ⚠️ هیچ نیایِ کارت نباید `filter`، `mask` یا `opacity` کمتر از ۱ داشته
 * باشد؛ هر کدام backdrop-root می‌سازد و شیشه دیگر لوگو را نمی‌بیند.
 */
function MemberCard({
  holder,
  account,
  accountLtr,
  planTitle,
  until,
  planKey,
}: {
  holder: string;
  account: string;
  accountLtr: boolean;
  planTitle: string;
  until: string;
  planKey: string;
}) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);

  function move(e: PointerEvent<HTMLDivElement>) {
    const el = stage.current;
    if (!el || reduce || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.dataset.tilting = "true";
    el.style.setProperty("--px", (x - 0.5).toFixed(3));
    el.style.setProperty("--py", (y - 0.5).toFixed(3));
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }

  function leave() {
    const el = stage.current;
    if (!el) return;
    el.dataset.tilting = "false";
    for (const k of ["--px", "--py", "--mx", "--my"]) el.style.removeProperty(k);
  }

  return (
    <div ref={stage} className={css.stage} onPointerMove={move} onPointerLeave={leave}>
      <span aria-hidden className={css.orb} />
      <span aria-hidden className={css.orb} />
      <motion.div
        aria-hidden
        className={css.logo}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <MainLogo />
      </motion.div>

      <motion.div
        initial={{ y: 40, rotateX: 25 }}
        animate={{ y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className={css.glass}>
          <span key={planKey} aria-hidden className={css.sweep} />

          <div className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-2 text-lg font-black">
                <span className="size-7">
                  <MainLogo />
                </span>
                سروا پلاس
              </span>
              <span className={css.chip} aria-hidden />
            </div>

            <div>
              <p className="truncate text-xl font-black sm:text-2xl">{holder}</p>
              <p
                dir={accountLtr ? "ltr" : undefined}
                className="mt-1 truncate text-xs tracking-wide text-foreground/60 [text-align:right]"
              >
                {account}
              </p>
            </div>

            <div className="flex items-end justify-between gap-3 text-xs">
              <div>
                <p className="text-foreground/55">اعتبار تا</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={until}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.25 }}
                    className="mt-0.5 text-sm font-bold"
                  >
                    {until}
                  </motion.p>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={planTitle}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-[60%] truncate rounded-full bg-foreground/[0.07] px-3 py-1 font-bold ring-1 ring-foreground/10"
                >
                  {planTitle}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
