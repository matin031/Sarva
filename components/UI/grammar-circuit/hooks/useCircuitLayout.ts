"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  solveHitExtents,
  solveSlotCenters,
  type GrammarCircuitConfig,
} from "@/lib/grammar-circuit";

/** همهٔ اعدادِ هندسی در *یک* فضای مختصات‌اند: فضای `CircuitContent`.
 *
 *  مختصاتِ پنجره و مختصاتِ محتوا هیچ‌جا با هم قاطی نمی‌شوند؛ برای همین با
 *  اسکرولِ افقیِ ناحیهٔ تحلیل، جمله و سوکت و سیم و باتری و لامپ همه با هم
 *  حرکت می‌کنند و سیم از سوکتش جدا نمی‌شود.
 *
 *  ── قاعدهٔ سختِ این فایل ────────────────────────────────────────────────
 *
 *  اندازهٔ محتوا **هرگز** از کادرِ خودِ `CircuitContent` خوانده نمی‌شود؛ فقط از
 *  چند لنگرِ معناییِ مشخص می‌آید:
 *
 *      ردیفِ جمله · نوارِ سوکت‌ها · پایانهٔ باتری · پایانهٔ لامپ
 *
 *  دلیلش یک باگِ واقعی است: لایهٔ SVG فرزندِ همان `CircuitContent` است. اگر
 *  اندازهٔ محتوا از کادرِ والد خوانده شود و همان عدد به SVG داده شود، کافی است
 *  یک بار SVG از جریانِ چیدمان بیرون نباشد تا حلقه بسته شود:
 *
 *      اندازه‌گیریِ والد → بزرگ‌شدنِ SVG → بزرگ‌شدنِ والد → اندازه‌گیریِ دوباره…
 *
 *  در عمل هم همین شد: وقتی قواعدِ `.gc-*` به مرورگر نرسیدند، `svg` با
 *  `display:block`ِ preflight یک فرزندِ درون‌جریان شد و ارتفاع تا ده‌ها هزار
 *  پیکسل بالا رفت. حالا لنگرها هیچ‌کدام به SVG وابسته نیستند، پس حلقه از
 *  ریشه ممکن نیست — حتی اگر هیچ CSSی بارگذاری نشود.
 *
 *  به همین دلیل `ResizeObserver` هم *لنگرها* را می‌پاید، نه خودِ محتوا را:
 *  اندازهٔ محتوا معلول است، نه علت. */

export interface SlotGeometry {
  tokenId: string;
  /** مرکزِ نهاییِ سوکت (پس از حلِ هم‌پوشانی) در فضای محتوا. */
  centerX: number;
  /** مرکزِ واژه — اگر با مرکزِ سوکت فرق داشته باشد، خطِ راهنما لازم است. */
  wordCenterX: number;
  wordBottomY: number;
  hitLeft: number;
  hitRight: number;
}

export interface CircuitGeometry {
  epoch: number;
  /** کادرِ *معناییِ* محتوا — از لنگرها، نه از کادرِ والد. */
  contentWidth: number;
  contentHeight: number;
  laneOffsetX: number;
  laneCenterY: number;
  laneHeight: number;
  slots: SlotGeometry[];
  power: { x: number; y: number } | null;
  lamp: { x: number; y: number } | null;
}

interface Options {
  contentRef: RefObject<HTMLDivElement | null>;
  sentenceRef: RefObject<HTMLElement | null>;
  laneRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  powerRef: RefObject<HTMLDivElement | null>;
  lampRef: RefObject<HTMLDivElement | null>;
  /** شناسهٔ توکن‌های دارای سوکت، به ترتیبِ ظاهرشدن در جمله. */
  slotTokenIds: readonly string[];
  epoch: number;
  config: GrammarCircuitConfig;
}

/** اگر `document.fonts` نبود یا هرگز resolve نشد، بعد از این مدت به‌هرحال
 *  اندازه می‌گیریم — بازی نباید منتظرِ چیزی بماند که شاید هیچ‌وقت نیاید. */
const FONT_READY_FALLBACK_MS = 1500;

/** حاشیهٔ امنِ راست/پایینِ کادرِ معنایی، برای ضخامتِ سیم و هالهٔ لامپ. */
const CONTENT_MARGIN = 8;

/** این بازی افقی گسترده است، نه عمودی بی‌انتها. ارتفاعِ تخته هیچ‌وقت نباید از
 *  چند برابرِ ناحیهٔ تحلیل بیشتر شود؛ اگر شد، یعنی چیزی در اندازه‌گیری خراب
 *  است و باید سر و صدا کند، نه اینکه بی‌صدا رندر شود. */
const MAX_CONTENT_HEIGHT_FACTOR = 4;
const MAX_CONTENT_HEIGHT_FLOOR = 900;
/** چند اندازه‌گیریِ پیاپیِ صعودی، بدونِ تغییرِ اندازهٔ پنجره = حلقهٔ بازخورد. */
const GROWTH_STREAK_LIMIT = 4;

export function useCircuitLayout({
  contentRef,
  sentenceRef,
  laneRef,
  viewportRef,
  powerRef,
  lampRef,
  slotTokenIds,
  epoch,
  config,
}: Options) {
  const [geometry, setGeometry] = useState<CircuitGeometry | null>(null);
  const wordRefs = useRef(new Map<string, HTMLElement>());
  const slotKey = slotTokenIds.join("|");

  const registerWord = useCallback((tokenId: string, el: HTMLElement | null) => {
    if (el) wordRefs.current.set(tokenId, el);
    else wordRefs.current.delete(tokenId);
  }, []);

  /** نگهبانِ حلقهٔ بازخورد. اگر ارتفاع چند بار پشتِ سرِ هم و بدونِ دلیل بالا
   *  برود، اندازه‌گیری «یخ» می‌زند تا به‌جای رندرِ یک SVGِ ۱۹۰۰۰ پیکسلی، خطای
   *  روشنی در کنسول بیاید. */
  const growthRef = useRef({ lastHeight: 0, streak: 0, frozen: false });

  useEffect(() => {
    growthRef.current = { lastHeight: 0, streak: 0, frozen: false };
  }, [epoch, slotKey]);

  const measure = useCallback(() => {
    const content = contentRef.current;
    const lane = laneRef.current;
    const sentence = sentenceRef.current;
    if (!content || !lane || !sentence) return;
    if (growthRef.current.frozen) return;

    // فقط *مبدأ* از کادرِ والد می‌آید. مبدأ یک نقطه است، نه یک اندازه، پس
    // نمی‌تواند به خودش بازخورد بدهد.
    const contentRect = content.getBoundingClientRect();
    if (contentRect.width === 0) return;
    const originX = contentRect.left;
    const originY = contentRect.top;

    const laneRect = lane.getBoundingClientRect();
    const sentenceRect = sentence.getBoundingClientRect();

    const ids = slotKey ? slotKey.split("|") : [];
    const desired: number[] = [];
    const words: Array<{ x: number; bottom: number }> = [];
    for (const id of ids) {
      const el = wordRefs.current.get(id);
      if (!el) return; // هنوز همه‌چیز در DOM نیست؛ اندازه‌گیری معتبر نیست.
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - originX;
      desired.push(x);
      words.push({ x, bottom: rect.bottom - originY });
    }

    const rtl = getComputedStyle(content).direction === "rtl";
    const laneOffsetX = laneRect.left - originX;
    const half = config.slotWidth / 2;

    const centers = solveSlotCenters({
      desiredCenters: desired,
      minSeparation: config.slotWidth + config.slotGap,
      direction: rtl ? -1 : 1,
      minCenter: laneOffsetX + half,
      maxCenter: laneOffsetX + laneRect.width - half,
    });

    const extents = solveHitExtents(
      centers,
      config.slotWidth,
      config.hitTargetPadding,
      config.hitTargetMinGap,
    );

    const terminalRect = (host: HTMLElement | null) =>
      host?.querySelector<HTMLElement>("[data-gc-terminal]")?.getBoundingClientRect() ??
      null;
    const powerHost = powerRef.current?.getBoundingClientRect() ?? null;
    const lampHost = lampRef.current?.getBoundingClientRect() ?? null;
    const point = (rect: DOMRect | null) =>
      rect
        ? {
            x: rect.left + rect.width / 2 - originX,
            y: rect.top + rect.height / 2 - originY,
          }
        : null;

    /* ── کادرِ معنایی: اجتماعِ لنگرها، و بس ────────────────────────────────
       لایهٔ SVG، بافتِ تزئینی، خطوطِ راهنما، هاله و پیش‌نمایشِ کشیدن عمداً
       اینجا نیستند — نه با فیلتر، بلکه چون اصلاً اندازه‌گیری نمی‌شوند. */
    const anchors = [sentenceRect, laneRect, powerHost, lampHost].filter(
      (r): r is DOMRect => r !== null && r.width > 0,
    );
    let maxRight = 0;
    let maxBottom = 0;
    for (const rect of anchors) {
      maxRight = Math.max(maxRight, rect.right - originX);
      maxBottom = Math.max(maxBottom, rect.bottom - originY);
    }

    const contentWidth = Math.max(contentRect.width, maxRight + CONTENT_MARGIN);
    const contentHeight = maxBottom + CONTENT_MARGIN;

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
            `منطقی (${Math.round(ceiling)}px) گذشت. اندازه‌گیری متوقف شد تا به‌جای ` +
            "رندرِ یک تختهٔ غول‌آسا، مشکل دیده شود. لنگرها را بررسی کنید.",
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
              `${GROWTH_STREAK_LIMIT} بارِ پیاپی بالا رفت (${Math.round(
                growth.lastHeight,
              )}px → ${Math.round(contentHeight)}px) بدونِ تغییرِ پنجره. ` +
              "یعنی چیزی که اندازه‌اش را از این هندسه می‌گیرد، خودش در همین " +
              "هندسه شرکت می‌کند.",
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
      laneOffsetX,
      laneCenterY: laneRect.top + laneRect.height / 2 - originY,
      laneHeight: laneRect.height,
      slots: ids.map((tokenId, i) => ({
        tokenId,
        centerX: centers[i],
        wordCenterX: words[i].x,
        wordBottomY: words[i].bottom,
        hitLeft: extents[i].left,
        hitRight: extents[i].right,
      })),
      power: point(terminalRect(powerRef.current)),
      lamp: point(terminalRect(lampRef.current)),
    };

    // بدونِ این مقایسه، هر اندازه‌گیری یک رندر می‌سازد و ناظر دوباره آتش
    // می‌گیرد؛ نویزِ زیرِ نیم‌پیکسل هم نباید state عوض کند.
    setGeometry((prev) => (sameGeometry(prev, next) ? prev : next));
  }, [config, contentRef, epoch, lampRef, laneRef, powerRef, sentenceRef, slotKey, viewportRef]);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const schedule = () => {
      if (cancelled || raf) return;
      // اندازه‌گیری‌ها در یک فریم جمع می‌شوند؛ هر فریم اندازه نمی‌گیریم.
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!cancelled) measure();
      });
    };

    // ترتیبِ لازم: رندر ← آماده‌شدنِ فونت ← فریمِ بعد ← اندازه‌گیری ← نمایشِ سیم‌ها.
    // فونتِ فارسی عرضِ واژه‌ها را عوض می‌کند، پس اندازه‌گیریِ زودهنگام یعنی
    // سیمی که یک لحظه در جای غلط دیده می‌شود.
    let fallback: number | undefined;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      void fonts.ready.then(schedule).catch(schedule);
      fallback = window.setTimeout(schedule, FONT_READY_FALLBACK_MS);
    } else {
      schedule();
    }

    // فقط لنگرها و ناحیهٔ تحلیل پاییده می‌شوند — نه خودِ CircuitContent، که
    // اندازه‌اش *نتیجهٔ* همین‌هاست.
    const observer = new ResizeObserver(schedule);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (sentenceRef.current) observer.observe(sentenceRef.current);
    if (laneRef.current) observer.observe(laneRef.current);

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
  }, [laneRef, measure, sentenceRef, viewportRef]);

  // تغییرِ اندازهٔ پنجره باید نگهبان را آزاد کند: یخ‌زدگی مالِ حلقه است، نه
  // مالِ چیدمانِ تازه.
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

  return { geometry: measured ? geometry : null, measured, registerWord, measure };
}

function sameGeometry(a: CircuitGeometry | null, b: CircuitGeometry): boolean {
  if (!a) return false;
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5;
  if (
    a.epoch !== b.epoch ||
    !near(a.contentWidth, b.contentWidth) ||
    !near(a.contentHeight, b.contentHeight) ||
    !near(a.laneOffsetX, b.laneOffsetX) ||
    !near(a.laneCenterY, b.laneCenterY) ||
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
      !near(s.wordCenterX, t.wordCenterX) ||
      !near(s.wordBottomY, t.wordBottomY) ||
      !near(s.hitLeft, t.hitLeft) ||
      !near(s.hitRight, t.hitRight)
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
