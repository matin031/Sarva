"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/perf/use-perf";

/**
 * انتخابگرِ پنل — جایگزینِ `<select>`ِ بومیِ `kit/select.tsx`.
 *
 * ── چرا اصلاً جایگزین ──────────────────────────────────────────────────────
 * `<select>`ِ بومی روی موبایل عالی است و روی دسکتاپ زشت: مرورگر فهرست را با
 * قلم و رنگِ سیستم می‌کشد، پس داخلِ پنلی که همه‌چیزش گرد و روشن/تیره است،
 * یک مستطیلِ خاکستریِ بیگانه باز می‌شود. این نسخه همان کار را می‌کند و
 * ظاهرش از خودِ پنل می‌آید.
 *
 * ⚠️ ولی هرچه `<select>` رایگان می‌داد، اینجا باید دستی نوشته شود — و اگر
 * نوشته نشود، کنترل برای کاربرِ کیبورد یا صفحه‌خوان *از کار می‌افتد*، نه
 * اینکه فقط زشت شود. پس همه‌شان هست:
 *
 *   • نقش‌های `combobox`/`listbox`/`option` با `aria-activedescendant`
 *   • ↑ ↓ Home End Enter Space Esc Tab
 *   • تایپِ سریع (type-ahead) برای پریدن به گزینه
 *   • بستن با کلیکِ بیرون و برگرداندنِ فوکوس به دکمه
 *   • `aria-invalid` و `disabled` مثلِ ورودی‌های دیگر
 *
 * ⚠️ فیلترِ جست‌وجو از ۸ گزینه به بالا خودش روشن می‌شود. فهرستِ «شهر» تا ۵۰
 * ردیف دارد؛ پیمایشِ ۵۰ ردیف با فلش، همان چیزی است که `<select>` را قابلِ
 * تحمل می‌کرد.
 *
 * ⚠️ و یک ورودیِ مخفیِ واقعی هم رندر می‌شود. فرم‌های این پروژه روی
 * `FormData` و اعتبارسنجیِ بومیِ مرورگر حساب نمی‌کنند، ولی یک `<input
 * type="hidden">` با همان `name` یعنی اگر روزی فرمی به‌صورت بومی submit شد،
 * مقدار هم می‌رود.
 *
 * انیمیشنِ باز شدن — همان ریختِ «دکمه ذوب می‌شود و تبدیل به کارت می‌شود» —
 * از الگوی shared-layout استفاده می‌کند: هر دو حالت یک `layoutId` دارند، پس
 * موشن بینشان مورف می‌کند و نه fade.
 * اقتباس از: https://21st.dev — کامپوننتِ Select با framer-motion.
 */

export type SelectOption = {
  value: string;
  label: string;
  /** خطِ دومِ گزینه — مثلاً نامِ طرح کنارِ شمارهٔ سفارش. */
  description?: string;
  /** ایموجی یا نویسه‌ای که در مربعِ کنارِ گزینه می‌نشیند. */
  glyph?: string;
  disabled?: boolean;
};

type AnimatedSelectProps = {
  options: SelectOption[];
  value?: string | null;
  onValueChange: (value: string) => void;
  /** متنِ دکمه وقتی هیچ گزینه‌ای انتخاب نشده. */
  placeholder?: string;
  /** عنوانِ بالای فهرستِ باز. */
  heading?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** `undefined` یعنی «خودت تصمیم بگیر» (از ۸ گزینه به بالا). */
  searchable?: boolean;
  className?: string;
  "aria-labelledby"?: string;
  onBlur?: () => void;
};

const SEARCH_THRESHOLD = 8;

/**
 * بیشترین ردیفی که تأخیرِ پلکانیِ ورود می‌گیرد.
 *
 * ⚠️ ارتفاعِ فهرست `max-h-64` (۲۵۶ پیکسل) است و هر ردیف حدود ۳۶ پیکسل، پس
 * حدودِ هفت ردیف در نگاهِ اول دیده می‌شود. تأخیر دادن به ردیف‌های بیرونِ
 * کادر فقط انتظار می‌سازد، بی‌آنکه کسی انیمیشنش را ببیند.
 */
const STAGGER_LIMIT = 8;

/** نرمال‌سازیِ فارسی برای جست‌وجو: ی/ك عربی، اعرابِ زائد و فاصلهٔ مجازی. */
function normalize(text: string): string {
  return text
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ْـ‌‏‎]/g, "")
    .trim()
    .toLowerCase();
}

export function AnimatedSelect({
  options,
  value,
  onValueChange,
  placeholder = "انتخاب کنید",
  heading,
  id,
  name,
  disabled = false,
  invalid = false,
  searchable,
  className,
  onBlur,
  ...aria
}: AnimatedSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const typed = React.useRef({ text: "", at: 0 });

  const reduced = useReducedMotion();
  const reactId = React.useId();
  const listId = `${id ?? reactId}-listbox`;

  const selected = options.find((o) => o.value === value) ?? null;
  const withSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const visible = React.useMemo(() => {
    if (!withSearch || !query.trim()) return options;
    const q = normalize(query);
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query, withSearch]);

  /* ⚠️ نشانگر باید مهار شود و نه فقط در state نگه داشته شود.

     فهرستِ زیرِ دست کوتاه می‌شود — با هر حرفی که در جست‌وجو تایپ
     می‌شود، و در «شهر» با عوض شدنِ استان. اگر `active` روی چهل مانده
     باشد و فهرست دوتایی شود، گزینهٔ فعال پوچ است: Enter هیچ کاری
     نمی‌کند و صفحه‌خوان هیچ گزینهٔ فعالی اعلام نمی‌کند. */
  const activeIndex = Math.min(active, Math.max(0, visible.length - 1));

  /* ⚠️ باز که می‌شود، نشانگر روی گزینهٔ *فعلی* می‌ایستد و نه روی اولی —
     وگرنه کاربرِ کیبورد هر بار باید از «آذربایجان شرقی» تا «یزد» فلش بزند. */
  const openList = () => {
    if (disabled) return;
    setQuery("");
    const at = options.findIndex((o) => o.value === value);
    setActive(at >= 0 ? at : 0);
    setOpen(true);
  };

  const closeList = (focusTrigger = true) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    closeList();
    /* ⚠️ react-hook-form برای «لمس‌شده» به `onBlur` نگاه می‌کند، و این
       کنترل هیچ‌وقت blurِ واقعی نمی‌دهد چون فوکوس داخلِ خودش می‌چرخد. */
    onBlur?.();
  };

  /* ── بستن با کلیکِ بیرون ────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onBlur]);

  /* فوکوس به جست‌وجو (اگر هست) وگرنه به خودِ فهرست، تا کلیدها جایی برسند. */
  React.useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (withSearch) searchRef.current?.focus();
      else listRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, withSearch]);

  /* گزینهٔ فعال همیشه در دید بماند. */
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: "nearest" });
  }, [open, active, query]);

  const move = (delta: number) => {
    if (visible.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < visible.length; step++) {
      next = (next + delta + visible.length) % visible.length;
      if (!visible[next]?.disabled) break;
    }
    setActive(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(visible.length - 1);
        return;
      case "Enter":
        event.preventDefault();
        if (visible[activeIndex]) choose(visible[activeIndex]);
        return;
      case "Escape":
        event.preventDefault();
        closeList();
        return;
      case "Tab":
        /* ⚠️ Tab نباید جلویش گرفته شود — ولی فهرست باید بسته شود، وگرنه
           کاربر به فیلدِ بعدی می‌رود و یک کارتِ باز پشتِ سرش می‌ماند. */
        setOpen(false);
        setQuery("");
        onBlur?.();
        return;
      case " ":
        /* فاصله فقط وقتی «انتخاب» است که در جست‌وجو تایپ نمی‌شود. */
        if (!withSearch) {
          event.preventDefault();
          if (visible[activeIndex]) choose(visible[activeIndex]);
        }
        return;
      default:
        break;
    }

    /* تایپِ سریع — فقط وقتی فیلدِ جست‌وجو نیست، وگرنه دوبار کار می‌کند. */
    if (!withSearch && event.key.length === 1) {
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? event.key : typed.current.text + event.key;
      typed.current.at = now;
      const q = normalize(typed.current.text);
      const hit = visible.findIndex((o) => normalize(o.label).startsWith(q));
      if (hit >= 0) setActive(hit);
    }
  };

  const listboxProps = {
    role: "listbox" as const,
    id: listId,
    "aria-activedescendant": visible[activeIndex] ? `${listId}-${activeIndex}` : undefined,
  };

  return (
    <MotionConfig
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
      }
    >
      {/* ⚠️ ارتفاعِ حداقلی برابرِ ارتفاعِ دکمه است و فهرستِ باز `absolute`
          می‌شود. بدونِ این، باز کردنِ «استان» کلِ شبکهٔ فرم را هل می‌داد و
          فیلدهای پایین‌تر زیرِ پای کاربر جابه‌جا می‌شدند. */}
      <div ref={rootRef} className={cn("relative min-h-11", className)}>
        {name && <input type="hidden" name={name} value={value ?? ""} />}

        <AnimatePresence initial={false} mode="popLayout">
          {!open ? (
            <motion.button
              key="trigger"
              ref={triggerRef}
              type="button"
              id={id}
              layoutId={`select-${reactId}`}
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={false}
              aria-invalid={invalid || undefined}
              aria-labelledby={aria["aria-labelledby"]}
              onClick={openList}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openList();
                }
              }}
              className={cn(
                "flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-background/40 ps-4 pe-3 text-start text-sm",
                "transition-[border-color,box-shadow] duration-150",
                "hover:border-muted-foreground/50",
                "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-55",
                invalid && "border-destructive focus-visible:ring-destructive/25",
              )}
            >
              {selected?.glyph && (
                <span aria-hidden className="shrink-0 text-base leading-none">
                  {selected.glyph}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  !selected && "text-muted-foreground/60",
                )}
              >
                {selected?.label ?? placeholder}
              </span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </motion.button>
          ) : (
            <motion.div
              key="list"
              layoutId={`select-${reactId}`}
              className="absolute inset-x-0 top-0 z-50 overflow-hidden rounded-2xl border border-primary/30 bg-popover shadow-[0_18px_44px_#00000026]"
            >
              <motion.div
                layout="position"
                className="flex items-center justify-between gap-2 px-4 pt-3 pb-2"
              >
                <span className="truncate text-[12.5px] font-semibold text-muted-foreground">
                  {heading ?? placeholder}
                </span>
                <button
                  type="button"
                  aria-label="بستن فهرست"
                  onClick={() => closeList()}
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground/8 text-muted-foreground transition-colors hover:bg-foreground/15 hover:text-foreground"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </motion.div>

              {withSearch && (
                <motion.div layout="position" className="px-3 pb-2">
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background/50 px-2.5">
                    <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                      }}
                      onKeyDown={onKeyDown}
                      placeholder="جست‌وجو…"
                      aria-controls={listId}
                      aria-autocomplete="list"
                      className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </motion.div>
              )}

              {/* ⚠️ `sarva-scroll` اینجا آرایش نیست.

                  نوارِ اسکرولِ پیش‌فرضِ ویندوز یک ستونِ خاکستریِ ضخیم است که
                  خودش را جزئی از *مرورگر* نشان می‌دهد و نه جزئی از صفحه. در
                  فهرستِ «شهر» — که تا ۲۹ ردیف دارد و همیشه اسکرول می‌خورد —
                  همان ستون تمامِ کارِ این کارت را خنثی می‌کرد: کاربر یک کارتِ
                  گردِ تیره می‌دید با یک تکهٔ ویندوز چسبیده به لبه‌اش.

                  کلاسش از قبل در `globals.css` بود و فقط یک جا استفاده شده
                  بود. */}
              <div
                ref={listRef}
                tabIndex={withSearch ? -1 : 0}
                onKeyDown={withSearch ? undefined : onKeyDown}
                {...listboxProps}
                className="sarva-scroll max-h-64 overflow-y-auto overscroll-contain px-1.5 pb-2 outline-none"
              >
                {visible.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                    چیزی با «{query}» پیدا نشد.
                  </p>
                ) : (
                  visible.map((option, index) => {
                    const isActive = index === activeIndex;
                    const isSelected = option.value === value;
                    return (
                      /* ⚠️ ورودِ پلکانیِ گزینه‌ها — و سقفی که عمداً دارد.

                         هر گزینه با کمی تأخیرِ بیشتر از قبلی می‌آید، پس فهرست
                         «باز می‌شود» و نه اینکه یک‌باره ظاهر شود.

                         ⚠️ تأخیرِ پلکانی روی فهرستِ بلند یک دام است: با ۲۵
                         میلی‌ثانیه به‌ازای هر ردیف، ردیفِ چهلمِ «شهر» یک ثانیه
                         بعد می‌آمد — یعنی کاربرِ سریع روی فهرستی نیمه‌ساخته
                         اسکرول می‌کرد. `STAGGER_LIMIT` تأخیر را فقط به
                         ردیف‌هایی می‌دهد که در نگاهِ اول دیده می‌شوند. */
                      <motion.div
                        key={option.value || `empty-${index}`}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        data-active={isActive}
                        initial={{ opacity: 0, x: reduced ? 0 : 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: reduced ? 0 : 0.18,
                          delay: reduced ? 0 : Math.min(index, STAGGER_LIMIT) * 0.025,
                          ease: "easeOut",
                        }}
                        onPointerMove={() => setActive(index)}
                        onClick={() => choose(option)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                          isActive && "bg-primary/10 text-foreground",
                          option.disabled && "cursor-not-allowed opacity-45",
                        )}
                      >
                        {option.glyph && (
                          <span aria-hidden className="shrink-0 text-base leading-none">
                            {option.glyph}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.label}</span>
                          {option.description && (
                            <span className="block truncate text-[11.5px] text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check aria-hidden className="size-4 shrink-0 text-primary" />
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
