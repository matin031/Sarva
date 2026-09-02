"use client";

import { useEffect, useMemo, useRef } from "react";
import type { QualityProfile } from "./quality";

/** The "space cable": one long, meandering wire that drops in from the top of
 *  the page and snakes past every planet — never straight, always curving off to
 *  one side and back — all the way down to the final section. It draws itself as
 *  you scroll, with an energy pulse running along it and glowing nodes where it
 *  touches each planet.
 *
 *  ---------------------------------------------------------------------------
 *  ⚠️ چرا این SVG به چند تکه شکسته شد
 *  ---------------------------------------------------------------------------
 *  نسخهٔ قبلی یک SVG به ارتفاعِ کلِ سند بود (روی موبایل حدود ۸۰۰۰ پیکسل) که
 *  `stroke-dashoffset` اش به scroll timeline وصل بود. آن ویژگی paint-bound
 *  است، نه compositor-only: هر تغییرش یعنی رنگ‌آمیزیِ دوبارهٔ یک لایه به
 *  اندازهٔ کلِ صفحه، در هر فریمِ اسکرول.
 *
 *  حالا همان مسیر در چند SVG کنارِ هم کشیده می‌شود که هرکدام فقط یک نوار از
 *  صفحه را می‌پوشانند. ترفندش `viewBox` است: هر نوار همان `d` کاملِ مسیر را
 *  دارد ولی پنجره‌اش روی برشِ خودش تنظیم شده، پس هندسه دقیقاً همان است و
 *  درزی میانِ نوارها دیده نمی‌شود — ولی رنگ‌آمیزیِ هر نوار محدود به خودش است.
 *
 *  رسمِ تدریجی هم دیگر به اسکرول بسته نیست: هر نوار *یک بار* و با یک
 *  IntersectionObserver کشیده می‌شود و بعد تمام. یعنی به‌جای یک repaint در هر
 *  فریمِ اسکرول، چند انیمیشنِ کوتاهِ یک‌باره.
 *
 *  دو چیزِ دیگر که عمداً نیست: هیچ `<filter>` ای (یک feGaussianBlur روی این
 *  ارتفاع، یک سطحِ فیلترشدهٔ صفحه‌اندازه می‌سازد) و هیچ نوشتنِ style در
 *  شنوندهٔ اسکرول.
 */

const W = 100;
const H = 660;

type Pt = { x: number; y: number };

/** یک قطعهٔ مکعبیِ بزیه — واحدِ تقسیمِ کابل. */
type Segment = { from: Pt; c1: Pt; c2: Pt; to: Pt };

/** یک نوار: چند قطعهٔ پشتِ‌هم، به‌علاوهٔ محدودهٔ عمودیِ واقعیِ خودشان. */
export type CableBand = {
  d: string;
  /** مرزهای عمودی در واحدِ viewBox — شاملِ نقاطِ کنترل، تا هیچ‌جای منحنی
   *  بیرونِ کادر نیفتد و بریده نشود. */
  y0: number;
  y1: number;
};

/** Build the meander procedurally so the cable adapts to however many planets
 *  the page has, instead of being hand-tuned to one layout.
 *
 *  The curve is a Catmull-Rom spline converted to cubic Béziers. That matters
 *  for looks, not just maths: a Catmull-Rom passes *through* every waypoint
 *  with continuous tangents, so the wire sweeps past each planet on a smooth
 *  arc instead of arriving head-on and kinking away, which is what the ad-hoc
 *  control points did.
 *
 *  ⚠️ خروجی عمداً «قطعه‌ها» است و نه یک رشتهٔ `d` واحد: تقسیمِ کابل به نوارها
 *  روی همین قطعه‌ها انجام می‌شود. تلاشِ اولِ این کار فقط `viewBox` هر نوار را
 *  عوض می‌کرد و همان مسیرِ کامل را در هر ده نوار می‌گذاشت — که نتیجه‌اش بدتر
 *  بود: مرورگر هندسهٔ کلِ مسیر را ده بار پردازش می‌کرد و اندازه‌گیری نشان داد
 *  کابل به گران‌ترین چیزِ صفحه تبدیل شده. حالا هر نوار فقط قطعه‌های خودش را
 *  دارد.
 */
function buildCable(planetCount: number) {
  const bandCount = planetCount + 2;
  const band = H / bandCount;

  const nodes: Pt[] = [];
  for (let i = 0; i < planetCount; i++) {
    nodes.push({ x: i % 2 === 0 ? 78 : 22, y: (i + 1.5) * band });
  }

  // A lead-in: the wire drops in off-centre and swings across before it reaches
  // the first planet, so the opening reads as part of the meander instead of a
  // straight drop down the page.
  const pts: Pt[] = [
    { x: 38, y: -12 },
    { x: 58, y: band * 0.34 },
    { x: 34, y: band * 0.78 },
  ];
  nodes.forEach((n, i) => {
    pts.push(n);
    const next = nodes[i + 1];
    if (next) {
      // a mid waypoint nudged past centre gives the crossing its lazy S shape
      pts.push({ x: 50 + (n.x < 50 ? 9 : -9), y: (n.y + next.y) / 2 });
    }
  });
  pts.push({ x: 52, y: H - band * 0.45 });
  pts.push({ x: 48, y: H + 12 });

  // Catmull-Rom → Bézier: each segment's handles come from its neighbours'
  // positions, which is what keeps the tangents continuous across waypoints
  const segments: Segment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    });
  }

  // ---- گروه‌بندیِ قطعه‌ها در نوارها --------------------------------------
  // هر قطعه به نواری می‌رود که *پایانش* در آن است. چون قطعه‌ها پشتِ‌هم‌اند،
  // قطعه‌های هر نوار یک رشتهٔ پیوسته می‌سازند و نقطهٔ پایانیِ یک نوار دقیقاً
  // نقطهٔ آغازِ نوارِ بعدی است — پس هیچ درزی دیده نمی‌شود.
  const grouped: Segment[][] = Array.from({ length: bandCount }, () => []);
  for (const seg of segments) {
    const idx = Math.max(0, Math.min(bandCount - 1, Math.floor(seg.to.y / band)));
    grouped[idx].push(seg);
  }

  const n = (v: number) => v.toFixed(1);
  const bands: CableBand[] = grouped
    .map((segs) => {
      if (segs.length === 0) return null;
      let d = `M ${n(segs[0].from.x)} ${n(segs[0].from.y)}`;
      let y0 = segs[0].from.y;
      let y1 = segs[0].from.y;
      for (const sg of segs) {
        d += ` C ${n(sg.c1.x)} ${n(sg.c1.y)}, ${n(sg.c2.x)} ${n(sg.c2.y)}, ${n(sg.to.x)} ${n(sg.to.y)}`;
        for (const pt of [sg.c1, sg.c2, sg.to]) {
          if (pt.y < y0) y0 = pt.y;
          if (pt.y > y1) y1 = pt.y;
        }
      }
      // کمی حاشیه برای ضخامتِ قلم، وگرنه لبهٔ خط بریده می‌شود
      return { d, y0: y0 - 4, y1: y1 + 4 };
    })
    .filter((b): b is CableBand => b !== null);

  // a node on the closing section too, so the wire visibly terminates
  const glowNodes = [...nodes, { x: 52, y: H - band * 0.45 }];
  return { bands, nodes: glowNodes, segments };
}

export default function SpaceCable({
  planets = 5,
  quality,
}: {
  planets?: number;
  quality: QualityProfile;
}) {
  const { bands, nodes: NODES } = useMemo(() => buildCable(planets), [planets]);
  const ref = useRef<HTMLDivElement>(null);
  const cometRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<SVGPathElement>(null);
  const bandRefs = useRef<(SVGPathElement | null)[]>([]);
  const animate = quality.cableAnimation;

  /** مسیرِ کاملِ پیوسته — فقط برای اندازه‌گیریِ حرکتِ دنباله‌دار. هرگز کشیده
   *  نمی‌شود. */
  const fullPath = useMemo(() => bands.map((b, i) => (i === 0 ? b.d : b.d.replace(/^M[^C]*/, ""))).join(" "), [bands]);

  /**
   * رسمِ تدریجی — یک بار برای هر نوار، با IntersectionObserver.
   *
   * هر نوار طولِ خودش را دارد، پس انیمیشنش هم مستقل است: از «کشیده‌نشده» تا
   * «کامل» در ۷۰۰ms، و بعد ناظرش قطع می‌شود. به‌جای یک repaint در هر فریمِ
   * اسکرول روی یک لایهٔ صفحه‌اندازه، چند انیمیشنِ کوتاهِ محلی.
   */
  useEffect(() => {
    if (!animate) return;

    const paths = bandRefs.current.filter((x): x is SVGPathElement => x !== null);
    if (paths.length === 0) return;

    const anims: Animation[] = [];

    // همهٔ خواندن‌های هندسی، یک بار، پیش از هر نوشتن.
    const lengths = paths.map((path) => path.getTotalLength());
    paths.forEach((path, i) => {
      const len = lengths[i];
      path.style.strokeDasharray = `${len.toFixed(1)}`;
      path.style.strokeDashoffset = `${len.toFixed(1)}`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as SVGPathElement;
          observer.unobserve(el);
          anims.push(
            el.animate([{ strokeDashoffset: el.style.strokeDashoffset }, { strokeDashoffset: "0" }], {
              duration: 750,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "forwards",
            }),
          );
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const path of paths) observer.observe(path);

    return () => {
      observer.disconnect();
      for (const a of anims) a.cancel();
    };
  }, [animate, bands]);

  /**
   * دنباله‌دار.
   *
   * کلِ سفر یک بار به Web Animations API داده می‌شود: compositor خودش
   * transformها را درون‌یابی می‌کند، پس در هیچ فریمی نه جاوااسکریپتی اجرا
   * می‌شود و نه چیزی در DOM نوشته می‌شود — و چیزی نمی‌ماند که یک خواندنِ
   * layout را forced reflow کند. هندسه یک بار نمونه‌برداری می‌شود و فقط با
   * تغییرِ اندازه دوباره.
   */
  useEffect(() => {
    if (!animate) return;
    const path = measureRef.current;
    const comet = cometRef.current;
    const host = ref.current;
    if (!path || !comet || !host) return;

    let animation: Animation | null = null;

    const build = () => {
      animation?.cancel();
      const total = path.getTotalLength();
      const box = host.getBoundingClientRect();
      const SAMPLES = 140;
      const frames: Keyframe[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const pt = path.getPointAtLength((i / (SAMPLES - 1)) * total);
        frames.push({
          transform: `translate3d(${(pt.x / W) * box.width}px, ${(pt.y / H) * box.height}px, 0)`,
        });
      }
      animation = comet.animate(frames, {
        duration: 9000,
        iterations: Infinity,
        easing: "linear",
      });
    };

    build();

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      animation?.cancel();
    };
  }, [animate, fullPath]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    >
      {/* هر نوار یک SVG کوچک است که فقط قطعه‌های خودش را دارد و فقط ارتفاعِ
          خودش را می‌پوشاند. نقطهٔ پایانِ هر نوار همان نقطهٔ آغازِ نوارِ بعدی
          است، پس کابل پیوسته دیده می‌شود. */}
      {bands.map((b, i) => (
        <svg
          key={i}
          viewBox={`0 ${b.y0.toFixed(1)} ${W} ${(b.y1 - b.y0).toFixed(1)}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0"
          style={{
            top: `${(b.y0 / H) * 100}%`,
            height: `${((b.y1 - b.y0) / H) * 100}%`,
          }}
        >
          {i === 0 && (
            <defs>
              <linearGradient id="cableGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="45%" stopColor="var(--color-gold)" />
                <stop offset="100%" stopColor="var(--color-primary)" />
              </linearGradient>
            </defs>
          )}

          {/* faked glow: one wider translucent stroke instead of a blur filter */}
          <path
            d={b.d}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.1}
            vectorEffect="non-scaling-stroke"
          />

          <path
            ref={(node) => {
              bandRefs.current[i] = node;
            }}
            d={b.d}
            fill="none"
            stroke="url(#cableGrad)"
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}

      {/* the measuring path for the comet — never painted */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute size-0 opacity-0"
      >
        <path ref={measureRef} d={fullPath} fill="none" stroke="none" />
      </svg>

      {/* the energy comet, moved with transform only */}
      {animate && (
        <span
          ref={cometRef}
          className="absolute left-0 top-0"
          style={{ willChange: "transform" }}
        >
          <span className="absolute left-0 top-0 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eafff9] shadow-[0_0_18px_6px_rgba(160,255,240,0.55)]" />
        </span>
      )}

      {/* junction nodes — plain DOM so they stay perfectly round (the SVGs above
          are stretched with preserveAspectRatio="none", which would squash any
          circle drawn inside them into an ellipse) */}
      {NODES.map((n, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${n.x}%`, top: `${(n.y / H) * 100}%` }}
        >
          <span
            className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 35%, transparent), transparent)",
            }}
          />
          <span
            className="relative block size-2.5 rounded-full bg-gold shadow-[0_0_14px_var(--color-gold)]"
            style={
              animate
                ? {
                    animation: `cableNode 2.6s ease-in-out ${i * 0.35}s infinite`,
                    willChange: "transform",
                  }
                : undefined
            }
          />
        </span>
      ))}
    </div>
  );
}
