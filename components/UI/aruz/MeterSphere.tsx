"use client";

import { useEffect, useRef } from "react";

/** An interactive 3D sphere of عروضی feet (ارکان). The labels are distributed
 *  evenly over a sphere (Fibonacci lattice) and projected to 2D every frame, so
 *  text stays upright (billboarded) while depth drives its size, opacity and
 *  stacking. The user steers it by hovering/dragging with the pointer; it spins
 *  gently on its own when idle. No WebGL — pure math + DOM transforms. Honors
 *  reduced motion with a static arrangement. */

const ARKAN = [
  "فاعلاتن",
  "مفاعیلن",
  "مستفعلن",
  "فعولن",
  "فاعلن",
  "مفعولاتُ",
  "متفاعلن",
  "مفاعلتن",
  "مفتعلن",
  "فعلاتن",
  "مفاعلن",
  "فعِلن",
];

export default function MeterSphere({ reduced }: { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const N = ARKAN.length;
    const R = 150; // sphere radius in px
    const PERSP = 620; // perspective distance

    // even distribution on a unit sphere (Fibonacci lattice)
    const base = ARKAN.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / N);
      const theta = Math.sqrt(N * Math.PI) * phi;
      return [
        Math.cos(theta) * Math.sin(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(phi),
      ] as [number, number, number];
    });

    const st = {
      ax: -0.3,
      ay: 0,
      vx: 0.0004,
      vy: 0.003,
      tx: 0.0004, // target velocities (idle spin)
      ty: 0.003,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };
    const IDLE = { x: 0.0004, y: 0.003 };

    const render = () => {
      const cosX = Math.cos(st.ax);
      const sinX = Math.sin(st.ax);
      const cosY = Math.cos(st.ay);
      const sinY = Math.sin(st.ay);
      for (let i = 0; i < N; i++) {
        const [x, y, z] = base[i];
        // rotate around X then Y
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const scale = PERSP / (PERSP - z2 * R);
        const sx = x2 * R * scale;
        const sy = y1 * R * scale;
        const depth = (z2 + 1) / 2; // 0 = far, 1 = near
        const el = tagRefs.current[i];
        if (!el) continue;
        el.style.transform = `translate(-50%,-50%) translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${(0.6 + depth * 0.55).toFixed(3)})`;
        el.style.opacity = (0.32 + depth * 0.68).toFixed(3);
        el.style.zIndex = String(Math.round(z2 * 100) + 200);
        el.style.setProperty("--near", depth.toFixed(3));
      }
    };

    if (reduced) {
      st.ax = -0.35;
      st.ay = 0.5;
      render();
      return;
    }

    let raf = 0;
    const loop = () => {
      st.vx += (st.tx - st.vx) * 0.05;
      st.vy += (st.ty - st.vy) * 0.05;
      st.ax += st.vx;
      st.ay += st.vy;
      render();
      raf = requestAnimationFrame(loop);
    };
    loop();

    const el = stageRef.current;
    const onMove = (e: PointerEvent) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (st.dragging) {
        const dx = e.clientX - st.lastX;
        const dy = e.clientY - st.lastY;
        st.lastX = e.clientX;
        st.lastY = e.clientY;
        st.ay += dx * 0.006;
        st.ax -= dy * 0.006;
        st.tx = -dy * 0.0016;
        st.ty = dx * 0.0016;
        return;
      }
      // hover-steer: rotate toward the cursor, faster the farther from center
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      st.tx = -ny * 0.045;
      st.ty = nx * 0.045;
    };
    const onEnterLeaveReset = () => {
      st.tx = IDLE.x;
      st.ty = IDLE.y;
    };
    const onDown = (e: PointerEvent) => {
      st.dragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      try {
        el?.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onUp = () => {
      st.dragging = false;
    };

    el?.addEventListener("pointermove", onMove);
    el?.addEventListener("pointerleave", onEnterLeaveReset);
    el?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener("pointermove", onMove);
      el?.removeEventListener("pointerleave", onEnterLeaveReset);
      el?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [reduced]);

  return (
    <section dir="rtl" className="container relative py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          کرهٔ ارکان
        </span>
        <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
          ارکانِ عروض را بچرخان
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          با موس روی کره حرکت کن یا بکش تا بچرخد؛ هر گوشه‌اش یکی از ارکانِ عروضی
          است.
        </p>
      </div>

      <div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
        {/* ambient glow + decorative rings */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-8 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-full border border-primary/15"
          style={
            reduced ? undefined : { animation: "aruzSpin 32s linear infinite" }
          }
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-16 rounded-full border border-dashed border-gold/15"
          style={
            reduced
              ? undefined
              : { animation: "aruzSpin 24s linear infinite reverse" }
          }
        />

        {/* the interactive sphere stage */}
        <div
          ref={stageRef}
          className="relative size-full cursor-grab touch-none active:cursor-grabbing"
          style={{ perspective: `${620}px` }}
        >
          {ARKAN.map((word, i) => (
            <span
              key={word}
              ref={(node) => {
                tagRefs.current[i] = node;
              }}
              className="absolute left-1/2 top-1/2 rounded-full border border-primary/25 bg-card/70 px-3 py-1.5 text-sm font-bold whitespace-nowrap text-foreground shadow-[0_0_20px_-8px_var(--color-primary)] backdrop-blur-sm select-none"
              style={{
                willChange: "transform, opacity",
                textShadow:
                  "0 0 calc(var(--near, 0.5) * 14px) color-mix(in oklch, var(--color-primary) 60%, transparent)",
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
