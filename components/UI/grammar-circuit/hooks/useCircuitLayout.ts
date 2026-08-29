"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** هندسهٔ مدار — همه در فضای مختصاتِ `CircuitContent`.
 *
 *  ── چه چیزی نسبت به نسخهٔ قبل عوض شد ─────────────────────────────────────
 *
 *  قبلاً جمله به‌شکلِ یک خطِ پیوسته رندر می‌شد و سوکت‌ها در نواری *جدا* زیرش
 *  می‌نشستند؛ بعد مرکزِ هر واژه اندازه گرفته می‌شد، یک حل‌کنندهٔ هم‌پوشانی
 *  سوکت‌ها را کنار هم می‌چید، و هرجا سوکت از زیرِ واژه‌اش سُر می‌خورد یک خطِ
 *  راهنما می‌کشیدیم. یعنی رابطهٔ «این سوکت مالِ این واژه است» یک *تقریب* بود
 *  که بعد از چیدمان ساخته می‌شد.
 *
 *  حالا هر واژه و سوکتش در یک ستونِ مشترک‌اند. مرکزشان از نظر CSS یکی است،
 *  پس تراز دیگر محاسبه نمی‌شود — *ساختاری* است و خطایش صفر است. نه حل‌کنندهٔ
 *  هم‌پوشانی لازم است، نه خطِ راهنما.
 *
 *  چیزی که هنوز اندازه‌گیری لازم دارد فقط مسیرِ سیم است: مرکزِ سوکت‌ها و
 *  پایانه‌های باتری و لامپ، تا SVG بداند از کجا به کجا بکشد.
 *
 *  ── قاعدهٔ سختی که از باگِ قبلی مانده ────────────────────────────────────
 *
 *  اندازهٔ محتوا **هرگز** از کادرِ خودِ `CircuitContent` خوانده نمی‌شود، فقط از
 *  لنگرهای معنایی. لایهٔ SVG فرزندِ همان کادر است؛ اگر اندازه‌اش از والدش
 *  بیاید و خودش هم در آن والد شرکت کند، حلقه بسته می‌شود و ارتفاع تا ده‌ها
 *  هزار پیکسل بالا می‌رود. یک بار همین شد. */

export interface SlotGeometry {
  tokenId: string;
  /** مرکزِ سوکت در فضای محتوا. */
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
}

/** عرضِ *ذاتیِ* واژهٔ هدف — مبنای عرضِ سوکتش.
 *
 *  متن `nowrap` است، پس این عدد به عرضِ ستون وابسته نیست و با پهن‌شدنِ سوکت
 *  تغییر نمی‌کند. همین باعث می‌شود چرخهٔ «اندازه بگیر ← سوکت را پهن کن ←
 *  دوباره اندازه بگیر» در یک قدم آرام بگیرد. */
export type WordWidths = ReadonlyMap<string, number>;

export interface CircuitGeometry {
  epoch: number;
  contentWidth: number;
  contentHeight: number;
  slots: SlotGeometry[];
  wordWidths: WordWidths;
  /** پهن‌ترین *متنِ* برچسبِ نقش در این سؤال — نه پهنای کلِ قطعه.
   *
   *  کفِ عرضِ سوکت از همین می‌آید: خانه باید بتواند «مضاف‌الیه» را جا بدهد،
   *  وگرنه برچسب بعد از نشستن بیرون می‌زند. ولی *متنِ* برچسب مبناست نه
   *  کادرِ قطعه در سینی، چون قطعهٔ سینی لقیِ سخاوتمندانه‌ای دارد که خانه
   *  لازمش ندارد. اگر کادرِ قطعه را مبنا می‌گرفتیم، کف آن‌قدر بالا می‌رفت که
   *  همهٔ خانه‌ها هم‌اندازه شوند و رابطهٔ «این خانه مالِ این واژه است» از
   *  بین برود — دقیقاً همان چیزی که قرار بود درست شود. */
  roleFloorWidth: number;
  power: { x: number; y: number } | null;
  lamp: { x: number; y: number } | null;
}

interface Options {
  contentRef: RefObject<HTMLDivElement | null>;
  stripRef: RefObject<HTMLElement | null>;
  /** سینیِ نقش‌ها — برای اندازه‌گیریِ پهن‌ترین برچسبِ نقش. */
  trayRef: RefObject<HTMLElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  powerRef: RefObject<HTMLDivElement | null>;
  lampRef: RefObject<HTMLDivElement | null>;
  /** توکن‌های دارای سوکت، به ترتیبِ ظاهرشدن در جمله. */
  slotTokenIds: readonly string[];
  epoch: number;
}

const FONT_READY_FALLBACK_MS = 1500;
const CONTENT_MARGIN = 8;
const MAX_CONTENT_HEIGHT_FACTOR = 4;
const MAX_CONTENT_HEIGHT_FLOOR = 900;
const GROWTH_STREAK_LIMIT = 4;

export function useCircuitLayout({
  contentRef,
  stripRef,
  trayRef,
  viewportRef,
  powerRef,
  lampRef,
  slotTokenIds,
  epoch,
}: Options) {
  const [geometry, setGeometry] = useState<CircuitGeometry | null>(null);
  const socketRefs = useRef(new Map<string, HTMLElement>());
  const wordRefs = useRef(new Map<string, HTMLElement>());
  const slotKey = slotTokenIds.join("|");

  const registerSocket = useCallback((tokenId: string, el: HTMLElement | null) => {
    if (el) socketRefs.current.set(tokenId, el);
    else socketRefs.current.delete(tokenId);
  }, []);

  const registerWord = useCallback((tokenId: string, el: HTMLElement | null) => {
    if (el) wordRefs.current.set(tokenId, el);
    else wordRefs.current.delete(tokenId);
  }, []);

  /** نگهبانِ حلقهٔ بازخورد. */
  const growthRef = useRef({ lastHeight: 0, streak: 0, frozen: false });
  useEffect(() => {
    growthRef.current = { lastHeight: 0, streak: 0, frozen: false };
  }, [epoch, slotKey]);

  const measure = useCallback(() => {
    const content = contentRef.current;
    const strip = stripRef.current;
    if (!content || !strip) return;
    if (growthRef.current.frozen) return;

    // فقط *مبدأ* از کادرِ والد می‌آید — یک نقطه، نه یک اندازه.
    const contentRect = content.getBoundingClientRect();
    if (contentRect.width === 0) return;
    const originX = contentRect.left;
    const originY = contentRect.top;

    const ids = slotKey ? slotKey.split("|") : [];
    const slots: SlotGeometry[] = [];
    const wordWidths = new Map<string, number>();
    for (const tokenId of ids) {
      const el = socketRefs.current.get(tokenId);
      if (!el) return; // هنوز همه‌چیز در DOM نیست
      const r = el.getBoundingClientRect();
      slots.push({
        tokenId,
        centerX: r.left + r.width / 2 - originX,
        centerY: r.top + r.height / 2 - originY,
        halfWidth: r.width / 2,
        halfHeight: r.height / 2,
      });
      /* عرضِ خودِ واژه. `scrollWidth` عمداً به‌جای `getBoundingClientRect`:
         عرضِ *محتوا* را می‌دهد و اگر ستون پهن‌تر از متن شود بزرگ نمی‌شود. */
      const wordEl = wordRefs.current.get(tokenId);
      if (!wordEl) return;
      wordWidths.set(tokenId, Math.ceil(wordEl.scrollWidth));
    }

    const terminal = (host: HTMLElement | null) => {
      const node = host?.querySelector<HTMLElement>("[data-gc-terminal]");
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - originX,
        y: r.top + r.height / 2 - originY,
      };
    };
    const power = terminal(powerRef.current);
    const lamp = terminal(lampRef.current);

    let roleFloorWidth = 0;
    const tray = trayRef.current;
    if (tray) {
      for (const el of tray.querySelectorAll<HTMLElement>(".gc-module-label")) {
        roleFloorWidth = Math.max(roleFloorWidth, Math.ceil(el.scrollWidth));
      }
    }

    /* کادرِ معنایی: اجتماعِ لنگرها. لایهٔ SVG، هاله و بافتِ تزئینی نه فیلتر
       می‌شوند بلکه اصلاً اندازه‌گیری نمی‌شوند. */
    const stripRect = strip.getBoundingClientRect();
    const anchors: DOMRect[] = [stripRect];
    const powerRect = powerRef.current?.getBoundingClientRect();
    const lampRect = lampRef.current?.getBoundingClientRect();
    if (powerRect?.width) anchors.push(powerRect);
    if (lampRect?.width) anchors.push(lampRect);

    let maxRight = 0;
    let maxBottom = 0;
    for (const r of anchors) {
      maxRight = Math.max(maxRight, r.right - originX);
      maxBottom = Math.max(maxBottom, r.bottom - originY);
    }
    /* کادرِ روکش هرگز از کادرِ واقعیِ محتوا بزرگ‌تر نمی‌شود.
       دلیلش ظریف است: عنصرِ `position:absolute` در جریانِ چیدمان نیست، ولی
       *در ناحیهٔ سرریزِ اسکرولِ* والدش هست. پس یک SVGِ چند پیکسل بلندتر،
       ناحیهٔ مدار را عمودی اسکرول‌پذیر می‌کرد. `min` هر دو طرف را امن
       می‌کند: در حالتِ عادی از کادرِ محتوا بیرون نمی‌زند، و اگر روزی
       شیوه‌نامه نرسد و کادرِ محتوا رشد کند، لنگرها سقفش را نگه می‌دارند. */
    const contentWidth = Math.max(contentRect.width, maxRight + CONTENT_MARGIN);
    const contentHeight = Math.min(
      maxBottom + CONTENT_MARGIN,
      Math.max(contentRect.height, maxBottom),
    );

    /* ── بررسی‌های سلامتِ حالتِ توسعه ─────────────────────────────────── */
    if (!Number.isFinite(contentWidth) || !Number.isFinite(contentHeight)) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[grammar-circuit] هندسهٔ نامعتبر: عرض=${contentWidth} ارتفاع=${contentHeight}`,
        );
      }
      return;
    }
    if (contentWidth <= 0 || contentHeight <= 0) return;

    const viewportHeight = viewportRef.current?.clientHeight ?? 0;
    const ceiling = Math.max(
      MAX_CONTENT_HEIGHT_FLOOR,
      viewportHeight * MAX_CONTENT_HEIGHT_FACTOR,
    );
    if (contentHeight > ceiling) {
      growthRef.current.frozen = true;
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[grammar-circuit] ارتفاعِ محتوا (${Math.round(contentHeight)}px) از سقفِ ` +
            `منطقی (${Math.round(ceiling)}px) گذشت. اندازه‌گیری متوقف شد.`,
        );
      }
      return;
    }

    const growth = growthRef.current;
    if (contentHeight > growth.lastHeight + 1) {
      growth.streak += 1;
      if (growth.streak >= GROWTH_STREAK_LIMIT) {
        growth.frozen = true;
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "[grammar-circuit] حلقهٔ بازخوردِ اندازه‌گیری تشخیص داده شد: ارتفاع " +
              `${GROWTH_STREAK_LIMIT} بارِ پیاپی بالا رفت (${Math.round(growth.lastHeight)}` +
              `px → ${Math.round(contentHeight)}px) بدونِ تغییرِ پنجره.`,
          );
        }
        return;
      }
    } else {
      growth.streak = 0;
    }
    growth.lastHeight = contentHeight;

    const next: CircuitGeometry = {
      epoch,
      contentWidth,
      contentHeight,
      slots,
      wordWidths,
      roleFloorWidth,
      power,
      lamp,
    };
    setGeometry((prev) => (sameGeometry(prev, next) ? prev : next));
  }, [contentRef, epoch, lampRef, powerRef, slotKey, stripRef, trayRef, viewportRef]);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const schedule = () => {
      if (cancelled || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!cancelled) measure();
      });
    };

    // رندر ← آماده‌شدنِ فونت ← فریمِ بعد ← اندازه‌گیری ← نمایشِ سیم‌ها.
    let fallback: number | undefined;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      void fonts.ready.then(schedule).catch(schedule);
      fallback = window.setTimeout(schedule, FONT_READY_FALLBACK_MS);
    } else {
      schedule();
    }

    // فقط لنگرها و ناحیهٔ دید پاییده می‌شوند — نه خودِ CircuitContent، که
    // اندازه‌اش *نتیجهٔ* همین‌هاست.
    const observer = new ResizeObserver(schedule);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (stripRef.current) observer.observe(stripRef.current);

    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (fallback) clearTimeout(fallback);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [measure, stripRef, viewportRef]);

  useEffect(() => {
    const unfreeze = () => {
      growthRef.current = { lastHeight: 0, streak: 0, frozen: false };
    };
    window.addEventListener("resize", unfreeze);
    window.addEventListener("orientationchange", unfreeze);
    return () => {
      window.removeEventListener("resize", unfreeze);
      window.removeEventListener("orientationchange", unfreeze);
    };
  }, []);

  const measured = geometry !== null && geometry.epoch === epoch;
  return { geometry: measured ? geometry : null, measured, registerSocket, registerWord, measure };
}

function sameGeometry(a: CircuitGeometry | null, b: CircuitGeometry): boolean {
  if (!a) return false;
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5;
  if (
    a.epoch !== b.epoch ||
    !near(a.contentWidth, b.contentWidth) ||
    !near(a.contentHeight, b.contentHeight) ||
    !near(a.roleFloorWidth, b.roleFloorWidth) ||
    a.slots.length !== b.slots.length
  ) {
    return false;
  }
  for (let i = 0; i < a.slots.length; i++) {
    const s = a.slots[i];
    const t = b.slots[i];
    if (
      s.tokenId !== t.tokenId ||
      !near(s.centerX, t.centerX) ||
      !near(s.centerY, t.centerY) ||
      !near(s.halfWidth, t.halfWidth) ||
      a.wordWidths.get(s.tokenId) !== b.wordWidths.get(t.tokenId)
    ) {
      return false;
    }
  }
  const samePoint = (
    p: { x: number; y: number } | null,
    q: { x: number; y: number } | null,
  ) => (p === null || q === null ? p === q : near(p.x, q.x) && near(p.y, q.y));
  return samePoint(a.power, b.power) && samePoint(a.lamp, b.lamp);
}
