"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** کشیدن و رها کردن، با هدف‌گیریِ *دقیق*.
 *
 *  عمداً هیچ کتابخانه‌ای اینجا نیست و هیچ راهبردِ «نزدیک‌ترین مرکز» هم نیست.
 *  تنها قاعده این است: اشاره‌گر یا *داخلِ* یک ناحیهٔ لمسی است یا نیست.
 *
 *      داخلِ الف → الف
 *      داخلِ ب  → ب
 *      در شکاف  → هیچ
 *      بیرون    → هیچ
 *
 *  «رها کردن در شکاف» پاسخِ غلط نیست؛ فقط یک تعاملِ ناتمام است. اگر روزی دو
 *  ناحیه هم‌پوشانی پیدا کنند، نتیجه «مبهم» است و هیچ اتصالی ثبت نمی‌شود —
 *  نه قرعه‌کشی، نه نزدیک‌ترین.
 */

export type HitTestResult =
  | { kind: "none" }
  | { kind: "hit"; tokenId: string }
  | { kind: "ambiguous"; tokenIds: string[] };

export interface DragState {
  pieceId: string;
  pointerType: string;
  width: number;
  height: number;
}

interface Options {
  enabled: boolean;
  activationDistance: number;
  touchLiftPx: number;
  onPickup: (pieceId: string) => void;
  onDrop: (pieceId: string, tokenId: string) => void;
  /** لغو — نه پاسخِ غلط. */
  onCancel: (pieceId: string) => void;
}

interface Pending {
  pointerId: number;
  pieceId: string;
  pointerType: string;
  startX: number;
  startY: number;
  grabDx: number;
  grabDy: number;
  width: number;
  height: number;
  active: boolean;
}

export function useCircuitDnD({
  enabled,
  activationDistance,
  touchLiftPx,
  onPickup,
  onDrop,
  onCancel,
}: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [activeTargetTokenId, setActiveTargetTokenId] = useState<string | null>(null);

  const pendingRef = useRef<Pending | null>(null);
  const hitTargetsRef = useRef(new Map<string, HTMLElement>());
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const activeTargetRef = useRef<string | null>(null);
  /** پس از یک کشیدنِ واقعی، مرورگر یک `click` هم پشتِ سرِ `pointerup` می‌فرستد.
   *  آن یکی کلیک باید بلعیده شود، وگرنه «کشیدن» بلافاصله به «لمس برای گذاشتن»
   *  تبدیل می‌شود. پنجره عمداً کوتاه است (۱۵۰ms): در این فاصله کسی نمی‌تواند
   *  انگشتش را بردارد و عنصرِ دیگری را واقعاً لمس کند، ولی لمسِ سریعِ بعدی هم
   *  بی‌دلیل بلعیده نمی‌شود. */
  const suppressClickUntilRef = useRef(0);
  const clickSwallowerRef = useRef<{
    handler: (event: MouseEvent) => void;
    timer: number;
  } | null>(null);

  const releaseClickSwallower = useCallback(() => {
    const current = clickSwallowerRef.current;
    if (!current) return;
    clickSwallowerRef.current = null;
    window.removeEventListener("click", current.handler, true);
    clearTimeout(current.timer);
  }, []);

  const armClickSwallower = useCallback(() => {
    releaseClickSwallower();
    const handler = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      releaseClickSwallower();
    };
    const timer = window.setTimeout(() => releaseClickSwallower(), 150);
    clickSwallowerRef.current = { handler, timer };
    window.addEventListener("click", handler, true);
  }, [releaseClickSwallower]);

  const registerHitTarget = useCallback(
    (tokenId: string, el: HTMLElement | null) => {
      if (el) hitTargetsRef.current.set(tokenId, el);
      else hitTargetsRef.current.delete(tokenId);
    },
    [],
  );

  const hitTest = useCallback((x: number, y: number): HitTestResult => {
    const matches: string[] = [];
    for (const [tokenId, el] of hitTargetsRef.current) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        matches.push(tokenId);
      }
    }
    if (matches.length === 0) return { kind: "none" };
    if (matches.length === 1) return { kind: "hit", tokenId: matches[0] };
    return { kind: "ambiguous", tokenIds: matches };
  }, []);

  const paintGhost = useCallback(() => {
    rafRef.current = 0;
    const pending = pendingRef.current;
    const ghost = ghostRef.current;
    if (!pending?.active || !ghost) return;
    const lift = pending.pointerType === "touch" ? touchLiftPx : 0;
    const { x, y } = lastPointRef.current;
    ghost.style.transform = `translate3d(${x - pending.grabDx}px, ${
      y - pending.grabDy - lift
    }px, 0)`;
  }, [touchLiftPx]);

  const finish = useCallback(
    (mode: "drop" | "cancel", x?: number, y?: number) => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      activeTargetRef.current = null;
      setActiveTargetTokenId(null);
      setDrag(null);
      if (!pending) return;
      if (!pending.active) return;

      suppressClickUntilRef.current = performance.now() + 150;
      armClickSwallower();

      if (mode === "cancel" || x === undefined || y === undefined) {
        onCancel(pending.pieceId);
        return;
      }

      const result = hitTest(x, y);
      if (result.kind === "hit") {
        onDrop(pending.pieceId, result.tokenId);
        return;
      }
      if (result.kind === "ambiguous" && process.env.NODE_ENV !== "production") {
        console.error(
          "[grammar-circuit] رها کردن مبهم بود؛ هیچ اتصالی ثبت نشد. " +
            `ناحیه‌های لمسیِ هم‌پوشان: ${result.tokenIds.join(", ")}`,
        );
      }
      // شکاف، بیرونِ برد یا ابهام → لغو، نه پاسخِ غلط.
      onCancel(pending.pieceId);
    },
    [armClickSwallower, hitTest, onCancel, onDrop],
  );

  /** از `onPointerDown`ی خودِ ماژول صدا زده می‌شود. */
  const beginPointerDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, pieceId: string) => {
      if (!enabled) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (pendingRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      pendingRef.current = {
        pointerId: event.pointerId,
        pieceId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        grabDx: event.clientX - rect.left,
        grabDy: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        active: false,
      };
      lastPointRef.current = { x: event.clientX, y: event.clientY };
    },
    [enabled],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      lastPointRef.current = { x: event.clientX, y: event.clientY };

      if (!pending.active) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        // آستانهٔ کوچک ولی واقعی: لمسِ ساده نباید تصادفاً کشیدن شود.
        if (Math.hypot(dx, dy) < activationDistance) return;
        pending.active = true;
        onPickup(pending.pieceId);
        setDrag({
          pieceId: pending.pieceId,
          pointerType: pending.pointerType,
          width: pending.width,
          height: pending.height,
        });
      }

      event.preventDefault();
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paintGhost);

      const result = hitTest(event.clientX, event.clientY);
      const next = result.kind === "hit" ? result.tokenId : null;
      // فقط یک هدف در هر لحظه، و فقط وقتی *عوض* شد رندر می‌گیریم.
      if (next !== activeTargetRef.current) {
        activeTargetRef.current = next;
        setActiveTargetTokenId(next);
      }
    };

    const onUp = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      finish("drop", event.clientX, event.clientY);
    };

    const onPointerCancel = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      finish("cancel");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingRef.current) finish("cancel");
    };
    // چرخشِ دستگاه، رفتنِ تب به پس‌زمینه یا از دست رفتنِ فوکوس وسطِ کشیدن:
    // کشیدن بی‌سروصدا لغو می‌شود و هیچ «پاسخِ غلطی» ثبت نمی‌شود.
    const onInterrupt = () => {
      if (pendingRef.current) finish("cancel");
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onInterrupt);
    window.addEventListener("orientationchange", onInterrupt);
    document.addEventListener("visibilitychange", onInterrupt);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onInterrupt);
      window.removeEventListener("orientationchange", onInterrupt);
      document.removeEventListener("visibilitychange", onInterrupt);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      releaseClickSwallower();
    };
  }, [activationDistance, finish, hitTest, onPickup, paintGhost, releaseClickSwallower]);

  /** آیا این کلیک، دنبالهٔ یک کشیدنِ تمام‌شده است؟ */
  const shouldSuppressClick = useCallback(
    () => performance.now() < suppressClickUntilRef.current,
    [],
  );

  return {
    drag,
    activeTargetTokenId,
    beginPointerDrag,
    registerHitTarget,
    ghostRef,
    shouldSuppressClick,
    hitTest,
    hitTargetsRef,
  };
}
