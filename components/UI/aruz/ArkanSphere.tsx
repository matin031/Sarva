"use client";

import { useEffect, useRef } from "react";

/** An interactive 3D sphere of عروضی feet (ارکان). Labels are spread evenly over
 *  a sphere (Fibonacci lattice) and projected to 2D every frame, so text stays
 *  upright while depth drives size, opacity and stacking. Steer it by hovering
 *  or dragging; it spins gently on its own when idle. Clean floating style (no
 *  solid ball) with a soft aura + orbit rings so it reads as a sphere in both
 *  themes. Pure math + DOM transforms; honors reduced motion. */

const ARKAN = [
  "فاعلاتن",
  "مفاعیلن",
  "مستفعلن",
  "فعولن",
  "مفعول",
  "فاعلات",
  "فعلات",
  "مفتعلن",
  "مفاعیل",
  "فعلاتن",
  "مفاعلن",
  "فعلن",
];

export default function ArkanSphere({ reduced }: { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const N = ARKAN.length;
    const R = 155;
    const PERSP = 640;

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
      tx: 0.0004,
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
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const scale = PERSP / (PERSP - z2 * R);
        const sx = x2 * R * scale;
        const sy = y1 * R * scale;
        const depth = (z2 + 1) / 2; // 0 far, 1 near
        const el = tagRefs.current[i];
        if (!el) continue;
        el.style.transform = `translate(-50%,-50%) translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${(0.58 + depth * 0.62).toFixed(3)})`;
        el.style.opacity = (0.3 + depth * 0.7).toFixed(3);
        el.style.zIndex = String(Math.round(z2 * 100) + 200);
      }
    };

    const el = stageRef.current;

    if (reduced) {
      st.ax = -0.35;
      st.ay = 0.5;
      render();
      return;
    }

    // ~30fps is plenty for a slow spin and halves the work on weak devices
    const FRAME = 1000 / 30;
    let raf = 0;
    let last = 0;
    let visible = true;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (now - last < FRAME) return;
      last = now;
      st.vx += (st.tx - st.vx) * 0.05;
      st.vy += (st.ty - st.vy) * 0.05;
      st.ax += st.vx;
      st.ay += st.vy;
      render();
    };
    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    // pause the loop entirely while the sphere is scrolled off-screen
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    if (el) io.observe(el);
    start();
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
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      st.tx = -ny * 0.045;
      st.ty = nx * 0.045;
    };
    const onReset = () => {
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
    el?.addEventListener("pointerleave", onReset);
    el?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      stop();
      io.disconnect();
      el?.removeEventListener("pointermove", onMove);
      el?.removeEventListener("pointerleave", onReset);
      el?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [reduced]);

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
      {/* soft aura — gives the sphere presence without a hard edge (kept light
          so mobile GPUs don't choke on a huge blur surface) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-10 rounded-full bg-primary/20 blur-[56px]"
      />

      {/* orbit rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 rounded-full border border-primary/20"
        style={
          reduced ? undefined : { animation: "aruzSpin 32s linear infinite" }
        }
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-14 rounded-full border border-dashed border-gold/20"
        style={
          reduced
            ? undefined
            : { animation: "aruzSpin 24s linear infinite reverse" }
        }
      />

      {/* interactive sphere stage */}
      <div
        ref={stageRef}
        className="relative size-full cursor-grab touch-none active:cursor-grabbing"
        style={{ perspective: "640px" }}
      >
        {ARKAN.map((word, i) => (
          <span
            key={word}
            ref={(node) => {
              tagRefs.current[i] = node;
            }}
            className="absolute left-1/2 top-1/2 rounded-full border border-primary/30 bg-card px-3.5 py-1.5 text-sm font-bold whitespace-nowrap text-foreground shadow-[0_2px_10px_-4px_rgba(0,0,0,0.45)] select-none"
            style={{ willChange: "transform" }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
