"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveHitTarget, type HitTestResult } from "@/lib/grammar-circuit/hit-test";

export type { HitTestResult };

/** کشیدن و رها کردن.
 *
 *  ⚠️ این فایل قبلاً قاعدهٔ «یا دقیقاً داخل، یا هیچ» را داشت و رویش تأکید
 *  هم می‌کرد. روی گوشی کار نمی‌کرد: با انگشت روی مرکزِ خانه، هیچ اتفاقی
 *  نمی‌افتاد. آن قاعده برای موس نوشته شده بود، جایی که اشاره‌گر یک پیکسل
 *  است — نه برای انگشتی که چهل پیکسل پهنا دارد.
 *
 *  قاعدهٔ امروز:
 *
 *      مرکزِ قطعه داخلِ الف            → الف
 *      داخلِ الف و ب (هم‌پوشان)        → آنکه مرکزش نزدیک‌تر است
 *      داخلِ هیچ، ولی نزدیکِ الف       → الف   (تا شعاعِ snapTolerance)
 *      داخلِ هیچ و دور از همه          → هیچ
 *
 *  «رها کردن در جایِ خالی» هنوز پاسخِ غلط نیست، فقط یک تعاملِ ناتمام است.
 */


export interface DragState {
  pieceId: string;
  pointerType: string;
  width: number;
  height: number;
  /** جای اولیهٔ پیش‌نمایش، در مختصاتِ *پنجره*.
   *
   *  چرا در خودِ state و نه فقط در ref: پیش‌نمایش در یک پورتال رندر می‌شود و
   *  React اول آن را با `transform`ِ پیش‌فرض می‌نشاند و بعد افکت‌ها اجرا
   *  می‌شوند. در آن یک فریم، عنصر روی `translate3d(0,0,0)` است — یعنی گوشهٔ
   *  بالا-چپِ صفحه. همان یک فریم بود که به‌شکلِ «پرشِ قطعه از گوشهٔ صفحه»
   *  دیده می‌شد. حالا جای درست از همان اولین رندر روی عنصر می‌نشیند. */
  originLeft: number;
  originTop: number;
}

interface Options {
  enabled: boolean;
  activationDistance: number;
  touchLiftPx: number;
  /** شعاعِ چسبیدن وقتی مرکزِ قطعه داخلِ هیچ خانه‌ای نیست. */
  snapTolerance: number;
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
  /** فاصلهٔ نقطهٔ گرفتن تا گوشهٔ قطعه — در مختصاتِ پنجره. */
  grabDx: number;
  grabDy: number;
  width: number;
  height: number;
  /** عنصرِ مبدأ، برای رها کردنِ pointer capture و گذاشتنِ جای‌خالی. */
  sourceEl: HTMLElement | null;
  active: boolean;
}

export function useCircuitDnD({
  enabled,
  activationDistance,
  touchLiftPx,
  snapTolerance,
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

  /** کدام خانه؟ — پل به هندسهٔ محض.
   *
   *  تاریخچه و قاعده‌ها در `lib/grammar-circuit/hit-test.ts` نوشته شده؛ اینجا
   *  فقط مستطیل‌های زندهٔ DOM جمع می‌شوند و به آن سپرده می‌شوند. */
  const hitTest = useCallback((x: number, y: number, tolerance = 0): HitTestResult => {
    /* ترتیبِ Map ترتیبِ درج است و آن هم ترتیبِ سند — که در تساویِ کامل
       تعیین‌کننده می‌شود. هندسه‌اش در `lib/grammar-circuit/hit-test.ts` است و
       همان‌جا تست دارد. */
    const candidates = [];
    for (const [tokenId, el] of hitTargetsRef.current) {
      candidates.push({ tokenId, rect: el.getBoundingClientRect() });
    }
    return resolveHitTarget(x, y, candidates, tolerance);
  }, []);

  /** جای پیش‌نمایش را می‌نویسد.
   *
   *  همه‌چیز در مختصاتِ *پنجره* است چون پیش‌نمایش `position: fixed` است.
   *  هیچ‌جا `pageX/pageY`، `scrollX/scrollY` یا `devicePixelRatio` قاطی
   *  نمی‌شود؛ قاطی‌کردنِ همین‌ها بود که قطعه را چند صد پیکسل آن‌طرف‌تر
   *  می‌نشاند وقتی ناحیهٔ تحلیل افقی اسکرول شده بود. */
  const ghostPosition = useCallback(
    (pending: Pending, x: number, y: number) => {
      if (pending.pointerType !== "touch") {
        // موس دقیق است: قطعه از زیرِ همان نقطه‌ای بلند می‌شود که گرفته شده.
        return { left: x - pending.grabDx, top: y - pending.grabDy };
      }
      // ⚠️ روی لمس، محلِ گرفتن عمداً *نادیده* گرفته می‌شود.
      //
      // قبلاً همان grabDx/grabDy لمس را هم اداره می‌کرد، یعنی نقطهٔ سنجشِ
      // مقصد با هر بار برداشتن جابه‌جا می‌شد: اگر قطعه را از گوشه‌اش
      // می‌گرفتی، مقصد نیم‌قطعه آن‌طرف‌تر سنجیده می‌شد. رفتاری که هر بار
      // فرق کند یاد گرفتنی نیست؛ کاربر فقط می‌فهمد «گاهی می‌گیرد، گاهی نه».
      //
      // حالا قطعه همیشه وسطِ انگشت می‌نشیند و به اندازهٔ ثابتی بالاتر
      // کشیده می‌شود تا زیرِ انگشت پنهان نماند — یک رابطهٔ ثابت، برای همه.
      return { left: x - pending.width / 2, top: y - pending.height / 2 - touchLiftPx };
    },
    [touchLiftPx],
  );

  /** نقطه‌ای که مقصد با آن سنجیده می‌شود: **مرکزِ خودِ قطعه**، نه نوکِ انگشت.
   *
   *  این همان باگی بود که کاربر گزارش کرد «باید قطعه را *بالای* خانه ببرم تا
   *  بچسبد». روی لمس، پیش‌نمایش عمداً چند ده پیکسل بالاتر از انگشت کشیده
   *  می‌شود تا انگشت رویش را نپوشاند؛ ولی مقصد با مختصاتِ *انگشت* سنجیده
   *  می‌شد. پس وقتی کاربر قطعه را روی خانه می‌دید، انگشتش همان‌قدر پایین‌تر
   *  از خانه بود و هیچ برخوردی رخ نمی‌داد — و تنها راهِ موفقیت این بود که
   *  قطعه را بالاتر از خانه ببرد.
   *
   *  قاعدهٔ درست همانی است که چشم می‌بیند: «قطعه روی خانه است یا نه». پس
   *  مرکزِ قطعه مبنا می‌شود، برای موس و لمس یکسان. معناشناسیِ «داخل یا هیچ»
   *  دست‌نخورده می‌ماند: مرکزِ قطعه یا داخلِ یک ناحیهٔ لمسی است یا نیست. */
  const dropAnchor = useCallback(
    (pending: Pending, x: number, y: number) => {
      const { left, top } = ghostPosition(pending, x, y);
      return { x: left + pending.width / 2, y: top + pending.height / 2 };
    },
    [ghostPosition],
  );

  const paintGhost = useCallback(() => {
    rafRef.current = 0;
    const pending = pendingRef.current;
    const ghost = ghostRef.current;
    if (!pending?.active || !ghost) return;
    const { x, y } = lastPointRef.current;
    const { left, top } = ghostPosition(pending, x, y);
    ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, [ghostPosition]);

  const finish = useCallback(
    (mode: "drop" | "cancel", x?: number, y?: number) => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending?.sourceEl) {
        try {
          if (pending.sourceEl.hasPointerCapture(pending.pointerId)) {
            pending.sourceEl.releasePointerCapture(pending.pointerId);
          }
        } catch {
          /* عنصر ممکن است از DOM رفته باشد. */
        }
      }
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

      const anchor = dropAnchor(pending, x, y);
      const result = hitTest(anchor.x, anchor.y, snapTolerance);
      if (result.kind === "hit") {
        onDrop(pending.pieceId, result.tokenId);
        return;
      }
      // شکاف یا بیرونِ برد → لغو، نه پاسخِ غلط.
      onCancel(pending.pieceId);
    },
    [armClickSwallower, dropAnchor, hitTest, onCancel, onDrop, snapTolerance],
  );

  /** از `onPointerDown`ی خودِ ماژول صدا زده می‌شود. */
  const beginPointerDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>, pieceId: string) => {
      if (!enabled) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (pendingRef.current) return;
      /* `getBoundingClientRect` مختصاتِ پنجره می‌دهد و `clientX/clientY` هم
         مختصاتِ پنجره است. تفاضلشان یعنی «انگشت کجای قطعه را گرفته» — عددی
         که تا پایانِ کشیدن ثابت می‌ماند و باعث می‌شود قطعه دقیقاً از زیرِ
         همان نقطه بلند شود. */
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
        sourceEl: event.currentTarget,
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
        /* گرفتنِ pointer: از این لحظه همهٔ رویدادهای همین اشاره‌گر به این
           عنصر می‌رسند، حتی اگر انگشت از روی عنصرِ دیگری رد شود یا از پنجره
           بیرون برود. */
        try {
          pending.sourceEl?.setPointerCapture(event.pointerId);
        } catch {
          // بعضی مرورگرها روی عنصرِ از‌بین‌رفته خطا می‌دهند؛ کشیدن باید ادامه
          // پیدا کند چون شنونده‌ها روی window هستند.
        }
        onPickup(pending.pieceId);
        const origin = ghostPosition(pending, event.clientX, event.clientY);
        setDrag({
          pieceId: pending.pieceId,
          pointerType: pending.pointerType,
          width: pending.width,
          height: pending.height,
          originLeft: origin.left,
          originTop: origin.top,
        });
      }

      event.preventDefault();
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paintGhost);

      const anchor = dropAnchor(pending, event.clientX, event.clientY);
      const result = hitTest(anchor.x, anchor.y, snapTolerance);
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
  }, [activationDistance, dropAnchor, finish, ghostPosition, hitTest, onPickup, paintGhost, releaseClickSwallower, snapTolerance]);

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
