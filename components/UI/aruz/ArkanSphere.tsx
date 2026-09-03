"use client";

import { useEffect, useRef } from "react";
import {
  useQuality,
  useDocumentVisible,
  useScrolling,
} from "@/lib/perf/use-perf";

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

/** Light dust spread evenly over the sphere by a Fibonacci lattice — the same
 *  construction as the labels, just far denser. Rendered as tiny depth-faded
 *  dots, this is what makes the shape read as a solid volume; a latitude /
 *  meridian grid reads as graph paper instead. */
function buildDust(n: number): Float32Array {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const phi = Math.acos(-1 + (2 * i + 1) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    arr[i * 3] = Math.cos(theta) * Math.sin(phi);
    arr[i * 3 + 1] = Math.sin(theta) * Math.sin(phi);
    arr[i * 3 + 2] = Math.cos(phi);
  }
  return arr;
}

/** Two tilted great circles. Two is enough to sell the third dimension and
 *  still read as an orbit rather than as a wireframe. */
function buildOrbits(): Float32Array[] {
  const SEG = 56;
  return [0.42, -0.72].map((tilt) => {
    const ct = Math.cos(tilt);
    const stl = Math.sin(tilt);
    const arr = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) {
      const u = (i / SEG) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      // a unit circle in the xz plane, tipped around the x axis
      arr[i * 3] = cu;
      arr[i * 3 + 1] = su * stl;
      arr[i * 3 + 2] = su * ct;
    }
    return arr;
  });
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

  // ⚠️ سطحِ کیفیت جای معیارِ قدیمی `(pointer: coarse)` را می‌گیرد. آن پرسش
  // می‌گفت کاربر انگشت دارد یا موس — نه اینکه دستگاهش چقدر توان دارد.
  const { settings } = useQuality();
  const docVisible = useDocumentVisible();
  const scrolling = useScrolling();
  const { dust: DUST_N, dprCap, fps: TARGET_FPS } = settings;
  // حین اسکرول و در تبِ پنهان رسم متوقف می‌شود؛ آخرین فریم سرِ جایش می‌ماند
  // پس کره ناپدید نمی‌شود، فقط ثابت می‌ایستد.
  const allowed = docVisible && !scrolling;

  useEffect(() => {
    const el = stageRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const N = ARKAN.length;

    // بافرهایی که یک بار ساخته می‌شوند و در هر فریم دوباره پر — نه از نو
    // ساخته. رشتهٔ خالی یعنی «هنوز چیزی ننوشته‌ایم».
    const lastTransform: string[] = new Array(N).fill("");
    const lastOpacity: string[] = new Array(N).fill("");

    const base = ARKAN.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i + 1) / N);
      const theta = Math.sqrt(N * Math.PI) * phi;
      return [
        Math.cos(theta) * Math.sin(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(phi),
      ] as [number, number, number];
    });

    const dust = buildDust(DUST_N);
    const orbits = buildOrbits();
    const links = buildLinks(base);

    // ---- geometry cached from ResizeObserver, never re-read in the loop ----
    let W = 0;
    let H = 0;
    let R = 0; // label radius
    let RS = 0; // sphere-surface radius (dust + orbits)
    let PERSP = 0;

    /* 1.5, not 2. The labels are DOM text and stay crisp at any ratio; this
       canvas only ever draws soft dust dots and hairline rings, which have no
       hard edges to alias. At dpr 2 on a HiDPI screen the surface is 880x880 =
       774k pixels redrawn every frame — 1.78x the pixels of 1.5 — and that
       redraw is the page's steadiest per-frame cost. */
    // سقفِ DPR از سطحِ کیفیت می‌آید، نه از نوعِ اشاره‌گر.

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
    const fill = (c: string, fallback: string) => {
      ctx.fillStyle = fallback;
      ctx.fillStyle = c;
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

    // Everything is batched into three depth buckets, so a frame costs a fixed
    // handful of canvas calls no matter how many points there are.
    const DUST_ALPHA = [0.14, 0.34, 0.72];
    const DUST_R = [0.55, 0.9, 1.45];
    const ORBIT_ALPHA = [0.07, 0.16, 0.34];
    const LINK_ALPHA = [0.06, 0.14, 0.3];
    const NODE_ALPHA = [0.2, 0.45, 0.9];
    const bucket = (d: number) => (d < 0.34 ? 0 : d < 0.67 ? 1 : 2);

    const px2 = new Float32Array(N);
    const py2 = new Float32Array(N);
    const pd2 = new Float32Array(N);
    // last z-index written per label. transform and opacity are compositable,
    // but a z-index change forces the stacking order to be re-sorted and the
    // labels repainted — so it is only written when the integer actually moves.
    // Paint order only has to change when two feet actually cross each other.
    // Writing a quantised z-index every frame invalidated the stage's paint
    // order ~30 times a second, and each invalidation dragged a re-layerize and
    // a repaint of every label behind it — the single biggest cost on this page.
    const order = new Int32Array(N);
    const rank = new Int32Array(N).fill(-1);
    const depthOf = new Float32Array(N);
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
        // ⚠️ نوشتنِ استایلِ یکسان هم کار دارد: مرورگر باید رشته را بخواند و
        // با مقدارِ فعلی مقایسه کند. با ۱۲ برچسب × دو خصوصیت × هر فریم،
        // این‌ها جمع می‌شوند. رشتهٔ آخر را نگه می‌داریم و فقط وقتی واقعاً
        // عوض شده می‌نویسیم.
        const t = `translate(-50%,-50%) translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${(0.58 + depth * 0.62).toFixed(3)})`;
        if (lastTransform[i] !== t) {
          tag.style.transform = t;
          lastTransform[i] = t;
        }
        const o = (0.3 + depth * 0.7).toFixed(3);
        if (lastOpacity[i] !== o) {
          tag.style.opacity = o;
          lastOpacity[i] = o;
        }
        depthOf[i] = z2;
      }

      // back-to-front ranking; only written when the ordering really changed
      for (let i = 0; i < N; i++) order[i] = i;
      order.sort((a, b) => depthOf[a] - depthOf[b]);
      let orderChanged = false;
      for (let r = 0; r < N; r++) {
        if (rank[order[r]] !== r) {
          orderChanged = true;
          break;
        }
      }
      if (orderChanged) {
        for (let r = 0; r < N; r++) {
          const idx = order[r];
          rank[idx] = r;
          const tag = tagRefs.current[idx];
          if (tag) tag.style.zIndex = String(200 + r);
        }
      }

      // the gold accent swaps only when the frontmost foot actually changes
      if (nearIdx !== nearest) {
        tagRefs.current[nearest]?.classList.remove("arkan-near");
        tagRefs.current[nearIdx]?.classList.add("arkan-near");
        nearest = nearIdx;
      }

      // ---------- light dust, orbits, links, nodes ----------
      ctx.clearRect(0, 0, W, H);
      const dustPaths = [new Path2D(), new Path2D(), new Path2D()];
      const orbitPaths = [new Path2D(), new Path2D(), new Path2D()];
      const linkPaths = [new Path2D(), new Path2D(), new Path2D()];
      const nodePaths = [new Path2D(), new Path2D(), new Path2D()];

      for (let i = 0; i < dust.length; i += 3) {
        const x = dust[i];
        const y = dust[i + 1];
        const z = dust[i + 2];
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const scale = PERSP / (PERSP - z2 * RS);
        const depth = (z2 + 1) / 2;
        const b = bucket(depth);
        const px = cx + x2 * RS * scale;
        const py = cy + y1 * RS * scale;
        const p = dustPaths[b];
        p.moveTo(px + DUST_R[b], py);
        p.arc(px, py, DUST_R[b], 0, Math.PI * 2);
      }

      for (let c = 0; c < orbits.length; c++) {
        const curve = orbits[c];
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
            const p = orbitPaths[bucket((depth + ppd) / 2)];
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

      // a small bright node exactly under each rukn, anchoring it to the surface
      for (let i = 0; i < N; i++) {
        const b = bucket(pd2[i]);
        const r = 1.1 + pd2[i] * 1.5;
        const p = nodePaths[b];
        p.moveTo(px2[i] + r, py2[i]);
        p.arc(px2[i], py2[i], r, 0, Math.PI * 2);
      }

      fill(colorPrimary, FALLBACK_PRIMARY);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = DUST_ALPHA[b];
        ctx.fill(dustPaths[b]);
      }

      ctx.lineWidth = 1;
      stroke(colorPrimary, FALLBACK_PRIMARY);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = ORBIT_ALPHA[b];
        ctx.stroke(orbitPaths[b]);
      }
      stroke(colorGold, FALLBACK_GOLD);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = LINK_ALPHA[b];
        ctx.stroke(linkPaths[b]);
      }

      fill(colorGold, FALLBACK_GOLD);
      for (let b = 0; b < 3; b++) {
        ctx.globalAlpha = NODE_ALPHA[b];
        ctx.fill(nodePaths[b]);
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

    // نرخِ فریم از سطحِ کیفیت می‌آید: ۳۰ در high، ۲۲ در balanced، ۱۴ در low.
    const FRAME = 1000 / TARGET_FPS;
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

    // خارج از دید، تبِ پنهان، یا حینِ اسکرول — هر سه یعنی توقفِ کامل.
    //
    // ⚠️ `allowed` در وابستگی‌های این effect است، پس با هر تغییرِ وضعیت
    // effect دوباره اجرا و حلقه از نو ساخته می‌شود؛ `stop` در cleanup
    // تضمین می‌کند هرگز دو حلقهٔ هم‌زمان نماند (از جمله در Strict Mode).
    let onScreen = false;
    const sync = () => {
      if (onScreen && allowed) start();
      else stop();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      // حاشیه یعنی کره کمی پیش از رسیدن آماده است، نه اینکه ناگهان بپرد.
      { threshold: 0, rootMargin: "200px" },
    );
    io.observe(el);

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
  }, [reduced, allowed, DUST_N, dprCap, TARGET_FPS]);

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
        /* `contain` keeps the per-frame style work inside the sphere: without
           it every frame invalidated style for the whole document, which the
           trace showed as one full UpdateLayoutTree pass per frame. */
        /* no `perspective` here: the labels always project at z=0 because the
           depth scaling is computed by hand, so the only thing a 3D rendering
           context bought was a layer-sort on every frame. */
        style={{ contain: "layout style" }}
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
            /* opacity is written every frame too, so it belongs in the hint —
               otherwise the change is not treated as compositor-only */
            style={{ willChange: "transform, opacity" }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
