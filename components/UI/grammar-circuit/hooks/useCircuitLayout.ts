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
 *  حرکت می‌کنند و سیم از سوکتش جدا نمی‌شود. */
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

export function useCircuitLayout({
  contentRef,
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

  const measure = useCallback(() => {
    const content = contentRef.current;
    const lane = laneRef.current;
    if (!content || !lane) return;

    const contentRect = content.getBoundingClientRect();
    if (contentRect.width === 0 || contentRect.height === 0) return;
    const laneRect = lane.getBoundingClientRect();

    const ids = slotKey ? slotKey.split("|") : [];
    const desired: number[] = [];
    const words: Array<{ x: number; bottom: number }> = [];
    for (const id of ids) {
      const el = wordRefs.current.get(id);
      if (!el) return; // هنوز همه‌چیز در DOM نیست؛ اندازه‌گیری معتبر نیست.
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - contentRect.left;
      desired.push(x);
      words.push({ x, bottom: rect.bottom - contentRect.top });
    }

    const rtl = getComputedStyle(content).direction === "rtl";
    const laneOffsetX = laneRect.left - contentRect.left;
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

    const terminal = (host: HTMLElement | null) => {
      const node = host?.querySelector<HTMLElement>("[data-gc-terminal]");
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - contentRect.left,
        y: rect.top + rect.height / 2 - contentRect.top,
      };
    };

    const next: CircuitGeometry = {
      epoch,
      contentWidth: contentRect.width,
      contentHeight: contentRect.height,
      laneOffsetX,
      laneCenterY: laneRect.top + laneRect.height / 2 - contentRect.top,
      laneHeight: laneRect.height,
      slots: ids.map((tokenId, i) => ({
        tokenId,
        centerX: centers[i],
        wordCenterX: words[i].x,
        wordBottomY: words[i].bottom,
        hitLeft: extents[i].left,
        hitRight: extents[i].right,
      })),
      power: terminal(powerRef.current),
      lamp: terminal(lampRef.current),
    };

    // بدونِ این مقایسه، هر اندازه‌گیری یک رندر می‌سازد و ResizeObserver دوباره
    // آتش می‌گیرد — حلقه‌ای که هیچ‌وقت آرام نمی‌گیرد.
    setGeometry((prev) => (sameGeometry(prev, next) ? prev : next));
  }, [config, contentRef, epoch, laneRef, lampRef, powerRef, slotKey]);

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

    const observer = new ResizeObserver(schedule);
    if (contentRef.current) observer.observe(contentRef.current);
    if (viewportRef.current) observer.observe(viewportRef.current);

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
  }, [contentRef, measure, viewportRef]);

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
