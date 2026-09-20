"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import TestTube from "./TestTube";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import { playKimiaSfx } from "@/lib/kimia/sfx";
import { footVisual } from "@/lib/kimia/visuals";
import { liquidShades } from "@/lib/kimia/mix";
import type { FootKey } from "@/lib/kimia/types";

/**
 * رَکِ ارکان — به تعدادِ ارکانِ همین بیت، نه یکی بیشتر و نه یکی کمتر.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ رَک یک *شیء* است، نه یک تخته
 * ═══════════════════════════════════════════════════════════════════════
 * عرضش دقیقاً `slotCount × گامِ شیشه` است و نه ۱۰۰٪ِ صحنه: با سه رکن
 * کوچک است و با هشت رکن بزرگ، مثلِ یک رَکِ واقعی. تختهٔ تمام‌عرضِ قبلی
 * باعث می‌شد سه شیشه در یک میدانِ خالی شناور به‌نظر برسند و «تعدادِ
 * جایگاه» — که خودش صورتِ مسئله است — دیده نشود.
 *
 * ⚠️ جایگاهِ خالی خط‌چین و شماره ندارد. هر دو تزئین بودند: شماره چیزی
 * نمی‌گفت که ترتیبِ خودِ جایگاه‌ها نگوید، و خط‌چین یک حاشیهٔ تزئینیِ
 * دیگر بود. حالا فقط یک *فرورفتگی* هم‌شکلِ شیشه.
 *
 * ── پرواز ───────────────────────────────────────────────────────────────
 * ⚠️ FLIP علاوه بر جابه‌جایی، **مقیاس** را هم درون‌یابی می‌کند: شیشهٔ
 * پخش‌کننده و شیشهٔ نشسته در رَک هم‌اندازه نیستند (روی گوشی، آیتمِ وسطِ
 * چرخ‌فلک بزرگ‌تر هم هست)، پس بدونِ مقیاس، کپی در لحظهٔ فرود «می‌پرید».
 *
 * ⚠️ برگشت با یک *شبح* انجام می‌شود و نه با خودِ شیشه: داده در همان لحظهٔ
 * لمس عوض می‌شود، پس عنصرِ واقعی دیگر وجود ندارد.
 */

type Ghost = {
  id: number;
  foot: FootKey;
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number; scale: number };
};

export type FootRackProps = {
  slots: readonly (FootKey | null)[];
  activeSlot: number | null;
  interactive: boolean;
  reduced: boolean;
  /** پیش‌نمایشِ تزئینی صدا نمی‌دهد. */
  silent?: boolean;
  /** جای پخش‌کنندهٔ یک رکن — مبدأِ پرواز. */
  dispenserRect: (foot: FootKey) => DOMRect | null;
  /** مقصدِ شبحِ برگشت (روی چرخ‌فلک: مرکزِ ریل). */
  returnRect?: (foot: FootKey) => DOMRect | null;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
};

export default function FootRack({
  slots,
  activeSlot,
  interactive,
  reduced,
  silent,
  dispenserRect,
  returnRect,
  onSelectSlot,
  onClearSlot,
}: FootRackProps) {
  const socketRefs = useRef(new Map<number, HTMLLIElement>());
  const tubeRefs = useRef(new Map<number, HTMLElement>());
  const previous = useRef<readonly (FootKey | null)[]>([]);
  const ghostSeq = useRef(0);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);

  const place = KIMIA_CONFIG.motion.place;
  const reducedMs = KIMIA_CONFIG.motion.reduced.placeMs;

  const tubeRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      if (el) tubeRefs.current.set(index, el);
      else tubeRefs.current.delete(index);
    },
    [],
  );

  const socketRef = useCallback(
    (index: number) => (el: HTMLLIElement | null) => {
      if (el) socketRefs.current.set(index, el);
      else socketRefs.current.delete(index);
    },
    [],
  );

  /* ── پرواز و برگشت ────────────────────────────────────────────────────
     `useLayoutEffect` و نه `useEffect`: اندازه‌گیری باید پیش از اولین
     رنگ‌آمیزی باشد، وگرنه شیشه یک فریم در جای نهایی دیده می‌شود و بعد
     می‌پرد عقب. */
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = slots;
    if (before.length !== slots.length) return; // بیتِ تازه: پروازی نیست

    for (let index = 0; index < slots.length; index += 1) {
      const was = before[index] ?? null;
      const now = slots[index] ?? null;
      if (was === now) continue;

      const socket = socketRefs.current.get(index);

      /* نشستن: کپی از پخش‌کننده تا همین سوکت. */
      if (now) {
        const tube = tubeRefs.current.get(index);
        const source = dispenserRect(now);
        if (!tube || !socket) continue;
        if (reduced || !source) {
          tube.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMs });
          if (!silent) playKimiaSfx("settle");
          continue;
        }
        const target = tube.getBoundingClientRect();
        const dx = source.left + source.width / 2 - (target.left + target.width / 2);
        const dy = source.top - target.top;
        /* ⚠️ مقیاس هم درون‌یابی می‌شود، وگرنه فرود «پرش» دارد. */
        const scale = target.width > 0 ? source.width / target.width : 1;
        socket.dataset.lift = "true";
        const flight = tube.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${scale.toFixed(3)})`, opacity: 0.75 },
            {
              transform: `translate(${dx * 0.42}px, ${dy * 0.42 - place.arcLiftPx}px) scale(${(
                (scale + 1) / 2
              ).toFixed(3)}) rotate(${dx > 0 ? -6 : 6}deg)`,
              opacity: 1,
              offset: 0.5,
            },
            { transform: "translate(0, 5px) scale(1)", offset: 0.86 },
            { transform: "translate(0, 0) scale(1)" },
          ],
          { duration: place.flightMs, easing: "cubic-bezier(.34,.09,.2,1)" },
        );
        /* ⚠️ تُقِ نشستن روی *پایانِ خودِ انیمیشن* سوار است و نه یک
           `setTimeout` موازی. با تایمر، اگر رندرِ React یک فریم دیر
           می‌شد، صدا جلوتر از تصویر می‌افتاد (اندازه‌گیری‌شده: تا
           ۲۱۰ms اختلاف). */
        const done = () => {
          if (socket) delete socket.dataset.lift;
        };
        if (!silent) {
          flight.addEventListener("finish", () => playKimiaSfx("settle"), { once: true });
        }
        flight.onfinish = done;
        flight.oncancel = done;
        continue;
      }

      /* برداشتن: شبح از سوکت تا پخش‌کننده (یا مرکزِ چرخ‌فلک). */
      if (was && socket && !reduced) {
        const from = socket.getBoundingClientRect();
        const home = (returnRect ?? dispenserRect)(was);
        if (!home) continue;
        const id = ++ghostSeq.current;
        setGhosts((list) => [
          ...list,
          {
            id,
            foot: was,
            from: { x: from.left, y: from.top, width: from.width, height: from.height },
            to: {
              x: home.left + home.width / 2 - (from.left + from.width / 2),
              y: home.top - from.top,
              scale: from.width > 0 ? Math.min(1.4, home.width / from.width) : 1,
            },
          },
        ]);
      }
    }
  }, [dispenserRect, place.arcLiftPx, place.flightMs, reduced, reducedMs, returnRect, silent, slots]);

  const dropGhost = useCallback((id: number) => {
    setGhosts((list) => list.filter((ghost) => ghost.id !== id));
  }, []);

  /* ⚠️ «شلوغ» یعنی شش جایگاه به بالا. خودِ *شکستن به دو ردیف* کارِ CSS
     است و فقط روی گوشی اتفاق می‌افتد (آنجا هشت جایگاه در یک ردیف یعنی
     شیشه‌های ۱۸ پیکسلی)؛ روی دسکتاپ همان یک ردیف می‌ماند. اینجا فقط
     *تعداد* گفته می‌شود، چون فقط اینجا معلوم است. */
  const many = slots.length >= 6;

  return (
    <>
      <section
        className="km-rack"
        data-many={many || undefined}
        style={{ "--km-slot-count": slots.length } as React.CSSProperties}
        aria-label={`جایگاهِ ارکان، ${slots.length} جایگاه`}
      >
        <ul className="km-rack-row">
          {slots.map((foot, index) => {
            const shades = foot ? liquidShades(footVisual(foot).color) : null;
            return (
              <li
                key={index}
                ref={socketRef(index)}
                className="km-socket"
                /* ⚠️ خطِ زمانیِ ریختن شیشه‌ها را با همین صفت پیدا می‌کند
                   و نه با ref — دلیلش در `lib/kimia/scene.ts`. */
                data-slot={index}
                data-filled={foot ? true : undefined}
                data-active={activeSlot === index || undefined}
                style={shades ? ({ "--km-ink": shades.base } as React.CSSProperties) : undefined}
              >
                <span className="km-socket-well" aria-hidden />

                {foot ? (
                  <TestTube
                    ref={tubeRef(index)}
                    foot={foot}
                    role="placed"
                    label="name"
                    disabled={!interactive}
                    ariaLabel={`${foot}، جایگاهِ ${toFa(index + 1)} — برداشتن`}
                    onActivate={() => onClearSlot(index)}
                  />
                ) : (
                  /* ⚠️ ارتفاعِ خانه ثابت است (در CSS)، پس آمدنِ نامِ رکن
                     با نشستنِ شیشه هیچ‌چیز را جابه‌جا نمی‌کند. */
                  <button
                    type="button"
                    className="km-socket-empty"
                    aria-disabled={!interactive || undefined}
                    aria-pressed={activeSlot === index}
                    aria-label={`جایگاهِ ${toFa(index + 1)}، خالی — انتخاب برای ریختن`}
                    onClick={() => {
                      if (!interactive) return;
                      onSelectSlot(index);
                    }}
                  />
                )}

                <span className="km-socket-lip" aria-hidden />
              </li>
            );
          })}
        </ul>
      </section>

      {ghosts.length > 0 && (
        <div className="km-ghosts" aria-hidden>
          {ghosts.map((ghost) => (
            <GhostTube key={ghost.id} ghost={ghost} duration={place.returnMs} onDone={dropGhost} />
          ))}
        </div>
      )}
    </>
  );
}

/** یک کپیِ بی‌جان که به پخش‌کننده برمی‌گردد و می‌رود. */
function GhostTube({
  ghost,
  duration,
  onDone,
}: {
  ghost: Ghost;
  duration: number;
  onDone: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      onDone(ghost.id);
      return;
    }
    const { x, y, scale } = ghost.to;
    const animation = node.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${x * 0.5}px, ${y * 0.5 - 52}px) scale(${((1 + scale) / 2).toFixed(3)})`,
          opacity: 0.9,
          offset: 0.5,
        },
        { transform: `translate(${x}px, ${y}px) scale(${(scale * 0.9).toFixed(3)})`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(.4,0,.25,1)", fill: "forwards" },
    );
    const finish = () => onDone(ghost.id);
    animation.onfinish = finish;
    animation.oncancel = finish;
    return () => animation.cancel();
  }, [ghost, duration, onDone]);

  return (
    <div
      ref={ref}
      className="km-ghost"
      style={{
        left: `${ghost.from.x}px`,
        top: `${ghost.from.y}px`,
        width: `${ghost.from.width}px`,
        height: `${ghost.from.height}px`,
      }}
    >
      <TestTube foot={ghost.foot} role="placed" label="none" plain />
    </div>
  );
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
