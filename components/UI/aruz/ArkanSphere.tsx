"use client";

import { useEffect, useRef } from "react";

/** An interactive 3D sphere of عروضی feet (ارکان).
 *
 *  Twelve labels sit on a Fibonacci lattice and are projected to 2D every
 *  frame, so the text stays upright while depth drives size, opacity and
 *  stacking. Behind them a wireframe shell — three latitude rings and four
 *  meridians — is drawn on a 2D canvas from the same rotation, plus faint
 *  links between neighbouring feet. The shell is what finally makes the thing
 *  read as a globe rather than as floating chips, and it reads that way in
 *  light mode too. The label nearest the reader picks up a gold accent.
 *
 *  Steer it by hovering or dragging; it spins gently on its own when idle.
 *
 *  Cost control: one rAF loop for labels *and* canvas, capped at ~30fps,
 *  paused entirely while off-screen, DPR capped, canvas strokes batched into
 *  three depth buckets (6 stroke calls per frame, not ~300), and — the point of
 *  this pass — **zero layout reads in any hot path**: the stage box comes from
 *  ResizeObserver's contentRect and the pointer rect is cached on enter, so
 *  `pointermove` never calls getBoundingClientRect. Honors reduced motion. */

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

/** used only if the browser refuses an oklch string in canvas */
const FALLBACK_PRIMARY = "#00b3ad";
const FALLBACK_GOLD = "#d9a441";

/** unit-sphere polylines: 3 latitude rings + 4 great-circle meridians.
 *  Flat Float32Arrays so the render loop allocates nothing per point. */
function buildShell(): Float32Array[] {
  const SEG = 42;
  const curves: Float32Array[] = [];

  for (const lat of [-0.62, 0, 0.62]) {
    const arr = new Float32Array((SEG + 1) * 3);
    const r = Math.cos(lat);
    const y = Math.sin(lat);
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      arr[i * 3] = r * Math.cos(t);
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = r * Math.sin(t);
    }
    curves.push(arr);
  }

  for (let m = 0; m < 4; m++) {
    const lon = (m / 4) * Math.PI;
    const cl = Math.cos(lon);
    const sl = Math.sin(lon);
    const arr = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) {
      const u = (i / SEG) * Math.PI * 2;
      const cu = Math.cos(u);
      arr[i * 3] = cu * cl;
      arr[i * 3 + 1] = Math.sin(u);
      arr[i * 3 + 2] = cu * sl;
    }
    curves.push(arr);
  }

  return curves;
}

/** each foot linked to its single nearest neighbour, de-duplicated */
function buildLinks(pts: [number, number, number][]): [number, number][] {
  const seen = new Set<string>();
  const links: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const dx = pts[i][0] - pts[j][0];
      const dy = pts[i][1] - pts[j][1];
      const dz = pts[i][2] - pts[j][2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best < 0) continue;
    const key = i < best ? `${i}-${best}` : `${best}-${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push([i, best]);
  }
  return links;
}

export default function ArkanSphere({ reduced }: { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = stageRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const N = ARKAN.length;

    const base = ARKAN.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / N);
      const theta = Math.sqrt(N * Math.PI) * phi;
      return [
        Math.cos(theta) * Math.sin(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(phi),
      ] as [number, number, number];
    });

    const shell = buildShell();
    const links = buildLinks(base);

    // ---- geometry cached from ResizeObserver, never re-read in the loop ----
    let W = 0;
    let H = 0;
    let R = 0; // label radius
    let RS = 0; // wireframe radius
    let PERSP = 0;

    const dprCap = window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2;

    // ---- theme colours, read only when they can actually have changed ----
    let colorPrimary = FALLBACK_PRIMARY;
    let colorGold = FALLBACK_GOLD;
    let colorDirty = true;
    const readColors = () => {
      const cs = getComputedStyle(el);
      // `@theme inline` may or may not emit --color-*, so fall back to the raw
      // token the theme layer aliases
      const p =
        cs.getPropertyValue("--color-primary").trim() ||
        cs.getPropertyValue("--primary").trim();
      const g =
        cs.getPropertyValue("--color-gold").trim() ||
        cs.getPropertyValue("--gold").trim();
      if (p) colorPrimary = p;
      if (g) colorGold = g;
      colorDirty = false;
    };
    /** assigning an unparseable colour is a no-op, so the fallback survives */
    const stroke = (c: string, fallback: string) => {
      ctx.strokeStyle = fallback;
      ctx.strokeStyle = c;
    };

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

    // three paths per layer = three stroke calls instead of ~300
    let shellPaths = [new Path2D(), new Path2D(), new Path2D()];
    let linkPaths = [new Path2D(), new Path2D(), new Path2D()];
    const SHELL_ALPHA = [0.11, 0.22, 0.46];
    const LINK_ALPHA = [0.07, 0.16, 0.34];
    const bucket = (d: number) => (d < 0.34 ? 0 : d < 0.67 ? 1 : 2);

    const px2 = new Float32Array(N);
    const py2 = new Float32Array(N);
    const pd2 = new Float32Array(N);
    // last z-index written per label. transform and opacity are compositable,
    // but a z-index change forces the stacking order to be re-sorted and the
    // labels repainted — so it is only written when the integer actually moves.
    const lastZ = new Int16Array(N).fill(-32768);
    let nearest = -1;

    // pointer rect is cached on enter, so pointermove never reads layout
    let pointerRect: { cx: number; cy: number; hw: number; hh: number } | null =
      null;
    const cacheRect = () => {
      const r = el.getBoundingClientRect();
      pointerRect = {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        hw: r.width / 2 || 1,
        hh: r.height / 2 || 1,
      };
    };

    const render = () => {
      if (!W || !H) return;
      if (colorDirty) readColors();

      const cosX = Math.cos(st.ax);
      const sinX = Math.sin(st.ax);
      const cosY = Math.cos(st.ay);
      const sinY = Math.sin(st.ay);
      const cx = W / 2;
      const cy = H / 2;

      // ---------- labels ----------
      let nearIdx = 0;
      let nearZ = -Infinity;
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
        px2[i] = cx + sx;
        py2[i] = cy + sy;
        pd2[i] = depth;
        if (z2 > nearZ) {
          nearZ = z2;
          nearIdx = i;
        }
        const tag = tagRefs.current[i];
        if (!tag) continue;
        tag.style.transform = `translate(-50%,-50%) translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${(0.58 + depth * 0.62).toFixed(3)})`;
        tag.style.opacity = (0.3 + depth * 0.7).toFixed(3);
        const zi = Math.round(z2 * 40) + 200;
        if (zi !== lastZ[i]) {
          lastZ[i] = zi;
          tag.style.zIndex = String(zi);
        }
      }

      // the gold accent swaps only when the frontmost foot actually changes
      if (nearIdx !== nearest) {
        tagRefs.current[nearest]?.classList.remove("arkan-near");
        tagRefs.current[nearIdx]?.classList.add("arkan-near");
        nearest = nearIdx;
      }

      // ---------- wireframe shell + neighbour links ----------
      ctx.clearRect(0, 0, W, H);
      shellPaths = [new Path2D(), new Path2D(), new Path2D()];
      linkPaths = [new Path2D(), new Path2D(), new Path2D()];

      for (let c = 0; c < shell.length; c++) {
        const curve = shell[c];
        let ppx = 0;
        let ppy = 0;
        let ppd = 0;
        for (let i = 0; i < curve.length; i += 3) {
          const x = curve[i];
          const y = curve[i + 1];
          const z = curve[i + 2];
          const y1 = y * cosX - z * sinX;
          const z1 = y * sinX + z * cosX;
          const x2 = x * cosY + z1 * sinY;
          const z2 = -x * sinY + z1 * cosY;
          const scale = PERSP / (PERSP - z2 * RS);
          const sx = cx + x2 * RS * scale;
          const sy = cy + y1 * RS * scale;
          const depth = (z2 + 1) / 2;
          if (i > 0) {
            const p = shellPaths[bucket((depth + ppd) / 2)];
            p.moveTo(ppx, ppy);
            p.lineTo(sx, sy);
          }
          ppx = sx;
          ppy = sy;
          ppd = depth;
        }
      }

      for (let l = 0; l < links.length; l++) {
        const [i, j] = links[l];
        const p = linkPaths[bucket((pd2[i] + pd2[j]) / 2)];
        p.moveTo(px2[i], py2[i]);
        p.lineTo(px2[j], py2[j]);
      }

      ctx.lineWidth = 1;
      stroke(colorPrimary, FALLBACK_PRIMARY);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = SHELL_ALPHA[b];
        ctx.stroke(shellPaths[b]);
      }
      stroke(colorGold, FALLBACK_GOLD);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = LINK_ALPHA[b];
        ctx.stroke(linkPaths[b]);
      }
      ctx.globalAlpha = 1;
    };

    // ---- the ONLY box measurement: ResizeObserver's already-computed rect ----
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || !r.width || !r.height) return;
      W = Math.round(r.width);
      H = Math.round(r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      // scale with the stage so the sphere never overflows a narrow screen
      R = Math.min(W, H) * 0.35;
      RS = R * 0.78;
      PERSP = R * 4.13;
      colorDirty = true;
      pointerRect = null;
      render();
    });
    ro.observe(el);

    // a theme flip changes --color-primary / --color-gold
    const mo = new MutationObserver(() => {
      colorDirty = true;
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    if (reduced) {
      st.ax = -0.35;
      st.ay = 0.5;
      render();
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }

    // ~30fps is plenty for a slow spin and halves the work on weak devices
    const FRAME = 1000 / 30;
    let raf = 0;
    let last = 0;
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
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(el);
    start();

    const onEnter = () => cacheRect();
    const onMove = (e: PointerEvent) => {
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
      if (!pointerRect) cacheRect();
      const r = pointerRect!;
      const nx = (e.clientX - r.cx) / r.hw;
      const ny = (e.clientY - r.cy) / r.hh;
      st.tx = -ny * 0.045;
      st.ty = nx * 0.045;
    };
    const onReset = () => {
      pointerRect = null;
      st.tx = IDLE.x;
      st.ty = IDLE.y;
    };
    const onDown = (e: PointerEvent) => {
      cacheRect();
      st.dragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onUp = () => {
      st.dragging = false;
    };
    // scrolling invalidates the cached top/left while the pointer is inside
    const onScroll = () => {
      pointerRect = null;
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onReset);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onReset);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  return (
    <div className="relative z-20 mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
      {/* soft aura — a radial-gradient rather than a blurred disc, so no
          multi-pass blur has to be rasterised behind the sphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 22%, transparent), color-mix(in oklch, var(--color-primary) 7%, transparent) 58%, transparent)",
        }}
      />

      {/* luminous core, so the globe has a centre holding it together */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[38%] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 42%, transparent), color-mix(in oklch, var(--color-primary) 16%, transparent) 62%, transparent)",
        }}
      />

      {/* orbit rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 rounded-full border border-primary/20"
        style={
          reduced
            ? undefined
            : {
                animation: "aruzSpin 32s linear infinite",
                // promote the ring so the rotation runs on the compositor
                // instead of repainting the bordered circle every frame
                willChange: "transform",
              }
        }
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-14 rounded-full border border-dashed border-gold/20"
        style={
          reduced
            ? undefined
            : {
                animation: "aruzSpin 24s linear infinite reverse",
                willChange: "transform",
              }
        }
      />

      {/* interactive sphere stage */}
      <div
        ref={stageRef}
        className="relative z-20 size-full cursor-grab touch-none active:cursor-grabbing"
        style={{ perspective: "640px" }}
      >
        {/* wireframe shell — drawn from the same rotation as the labels */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
        />

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
