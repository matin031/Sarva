"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, AudioLines, BookOpen, ChartNoAxesCombined, Focus, Network, Sparkles } from "lucide-react";
import { GeometricPattern } from "@/components/persian-patterns";
import SarvaStar, { SARVA_STAR_PATH } from "@/components/UI/SarvaStar";
import { buildJourneyPoints, journeyViewportY } from "./journey-path";
import { LearningParallax } from "./LearningScenes";
import StarDock from "./StarDock";
import styles from "./plus-scroll.module.css";

export type Reason = { id: string; title: string; body: string; note: string };
export type CycleStep = { title: string; body: string };
const REASON_ICONS = [AudioLines, Network, BookOpen, Focus, ChartNoAxesCombined];

// Fixed positions avoid hydration differences. Mobile keeps only six small motes.
const PARALLAX_MOTES = [
  { x: 7, y: 5, w: 15, h: 126, speed: .8, tone: "teal", mobile: true },
  { x: 90, y: 9, w: 22, h: 180, speed: 1.35, tone: "gold" },
  { x: 21, y: 17, w: 9, h: 58, speed: 1.55, tone: "gold" },
  { x: 96, y: 22, w: 12, h: 110, speed: .7, tone: "teal", mobile: true },
  { x: 5, y: 28, w: 24, h: 168, speed: 1.3, tone: "teal" },
  { x: 80, y: 33, w: 10, h: 75, speed: .85, tone: "gold", mobile: true },
  { x: 38, y: 39, w: 12, h: 96, speed: 1.45, tone: "teal" },
  { x: 94, y: 43, w: 21, h: 145, speed: .75, tone: "gold" },
  { x: 11, y: 49, w: 14, h: 125, speed: 1.5, tone: "teal", mobile: true },
  { x: 87, y: 56, w: 16, h: 135, speed: 1.25, tone: "teal" },
  { x: 25, y: 62, w: 9, h: 66, speed: .8, tone: "gold" },
  { x: 96, y: 67, w: 12, h: 98, speed: 1.4, tone: "teal", mobile: true },
  { x: 6, y: 73, w: 21, h: 156, speed: .7, tone: "gold" },
  { x: 75, y: 78, w: 10, h: 82, speed: 1.45, tone: "teal" },
  { x: 17, y: 84, w: 14, h: 105, speed: .85, tone: "teal", mobile: true },
  { x: 91, y: 89, w: 17, h: 118, speed: 1.25, tone: "gold" },
];

function Jewel({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c3fff4" /><stop offset=".36" stopColor="#40d8cb" /><stop offset=".7" stopColor="#00a5a6" /><stop offset="1" stopColor="#006a76" />
        </linearGradient>
      </defs>
      <path d={SARVA_STAR_PATH} fill={`url(#${id})`} stroke="#8de6dc" strokeWidth=".45" strokeLinejoin="round" />
      <path d="m12 3 0 9-8-3.1 8 1.6 8-1.6-7 4 4 5.6-5-4-5 4 4-5.6Z" fill="#e8fff9" opacity=".2" />
    </svg>
  );
}

/** Native scrolling, a single scrubbed journey and geometry measured only on refresh. */
export default function PlusScrollPage({ reasons, cycle, plans, header, footer, markers = false, showPath = false }: {
  reasons: Reason[]; cycle: CycleStep[]; plans: ReactNode; header?: ReactNode; footer?: ReactNode; markers?: boolean; showPath?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const orbInnerRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let disposed = false;
    let teardown = () => {};
    // Keep the initial HTML readable; defer the animation library until hydration.
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      const root = rootRef.current;
      const orb = orbRef.current;
      const inner = orbInnerRef.current;
      const seed = seedRef.current;
      const dock = dockRef.current;
      if (!root || !orb || !inner || !seed || !dock) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", compact: "(max-width: 699px)" }, (context) => {
        if (!context.conditions?.motion) return;
        const compact = Boolean(context.conditions.compact);
        const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-reason-card]"));
        const glow = root.querySelectorAll("[data-dock-glow]");
        let journey: ReturnType<typeof gsap.timeline> | undefined;
        let startScroll = 0;
        let endScroll = 1;
        let fromDocumentY = 0;
        let toDocumentY = 1;
        let latestScroll = window.scrollY;
        let measured = false;
        const playhead = { progress: 0 };
        const position = { x: 0 };
        let lastTransform = "";
        // Scrub owns one complete transform write on its existing GSAP frame.
        // A second requestAnimationFrame would halve the star's update cadence.
        const renderPosition = () => {
          const y = journeyViewportY({ progress: playhead.progress, scroll: latestScroll,
            start: startScroll, end: endScroll, fromY: fromDocumentY, toY: toDocumentY });
          const transform = `translate3d(${position.x.toFixed(3)}px,${y.toFixed(3)}px,0) translate(-50%,-50%)`;
          if (transform !== lastTransform) { orb.style.transform = transform; lastTransform = transform; }
        };
        const buildJourney = () => {
          journey?.kill();
          const bounds = root.getBoundingClientRect();
          const seedBounds = seed.getBoundingClientRect();
          const dockBounds = dock.getBoundingClientRect();
          const dockWidth = dock.parentElement!.getBoundingClientRect().width;
          const center = (r: DOMRect) => ({ x: r.left + r.width / 2 - bounds.left, y: r.top + r.height / 2 - bounds.top });
          const from = center(seedBounds);
          const to = center(dockBounds);
          // Pass the cycle illustration (the copy's outside edge on mobile), then
          // trace the cards. Static slots keep entrance transforms out of geometry.
          const cycleSurface = root.querySelector<HTMLElement>(`.${compact ? styles.wheelCopy : styles.wheelArt}`);
          const surfaces = [...root.querySelectorAll<HTMLElement>("[data-journey-surface]"), ...(cycleSurface ? [cycleSurface] : []), ...cards.map((card) => card.parentElement!)].map((surface) => {
            const r = surface.getBoundingClientRect();
            return { left: r.left - bounds.left, right: r.right - bounds.left, top: r.top - bounds.top, bottom: r.bottom - bounds.top };
          }).sort((a, b) => a.top - b.top);
          const ordered = buildJourneyPoints({ from, to, width: bounds.width, compact, surfaces });
          const distance = to.y - from.y;
          fromDocumentY = bounds.top + window.scrollY + from.y;
          toDocumentY = bounds.top + window.scrollY + to.y;
          position.x = from.x + bounds.left;
          gsap.set(orb, { opacity: 1 });
          // Render the jewel at its largest size and only scale down, preserving
          // sharp edges when it lands (including high-DPI and zoomed displays).
          gsap.set(inner, { scale: seedBounds.width / 156, rotation: 0, rotationX: 0 });
          gsap.set(glow, { opacity: 0 });
          gsap.set(seed, { opacity: 0 });
          journey = gsap.timeline({ paused: true });
          for (let i = 1; i < ordered.length; i++) {
            const previous = ordered[i - 1];
            const point = ordered[i];
            journey.to(position, { x: point.x + bounds.left, duration: point.y - previous.y, ease: "sine.inOut" }, previous.y - from.y);
          }

          journey.to(inner, { scale: (compact ? 31.2 : 45.6) / 156, duration: 260, ease: "sine.out" }, 0);
          journey.to(inner, { scale: dockWidth / 360, rotationX: 48, rotation: 0, duration: 300, ease: "sine.inOut" }, distance - 300);
          journey.to(glow, { opacity: 1, duration: 45, ease: "sine.in" }, distance - 45);
          journey.fromTo(root.querySelector(`.${styles.dockAura}`), { scale: .88 }, { scale: 1, duration: 140, ease: "sine.out" }, distance - 140);
          startScroll = Math.max(0, fromDocumentY - window.innerHeight * .77);
          endScroll = Math.max(startScroll + 1, toDocumentY - window.innerHeight * .5);
          if (pathRef.current) pathRef.current.setAttribute("d", ordered.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "));
          latestScroll = window.scrollY;
          if (!measured) playhead.progress = Math.max(0, Math.min(1, (window.scrollY - startScroll) / (endScroll - startScroll)));
          measured = true;
          journey.progress(playhead.progress);
          renderPosition();
        };
        buildJourney();
        // The small proxy lets refresh replace the measured timeline without attaching
        // multiple scrub controllers to the star. No DOM reads happen during scrolling.
        const scrub = gsap.fromTo(playhead, { progress: 0 }, {
          progress: 1, ease: "none", paused: true, immediateRender: false,
          onUpdate: () => { journey?.progress(playhead.progress); renderPosition(); },
        });
        ScrollTrigger.create({
          animation: scrub, start: () => startScroll, end: () => endScroll,
          scrub: compact ? 1 : 1.25, invalidateOnRefresh: true, markers, id: "plus-journey",
        });
        const trackAnchor = () => {
          latestScroll = window.scrollY;
          // Between the anchors, scrub alone owns the viewport position.
          if (latestScroll < startScroll || latestScroll > endScroll) renderPosition();
        };
        window.addEventListener("scroll", trackAnchor, { passive: true });
        ScrollTrigger.addEventListener("refreshInit", buildJourney);
        cards.forEach((card) => {
          gsap.from(card, { y: 22, opacity: .35, duration: .65, ease: "power2.out", scrollTrigger: { trigger: card.parentElement, start: "top 90%", once: true } });
          gsap.timeline({ scrollTrigger: { trigger: card.parentElement, start: "top 75%", end: "bottom 25%", scrub: 1 } })
            .fromTo(card.querySelector(`.${styles.cardAura}`), { opacity: 0 }, { opacity: 1, duration: 1, ease: "sine.inOut" })
            .to(card.querySelector(`.${styles.cardAura}`), { opacity: 0, duration: 1, ease: "sine.inOut" });
        });
        root.querySelectorAll<HTMLElement>("[data-parallax-track]").forEach((track) => {
          if (compact && track.dataset.mobile !== "true") return;
          const speed = Number(track.dataset.speed);
          const travel = () => (1 - speed) * Math.min(window.innerHeight, 1000) * (compact ? .32 : .65);
          gsap.fromTo(track.firstElementChild, { y: () => -travel(), x: compact ? 0 : -5 }, {
            y: travel, x: compact ? 0 : 5, ease: "none",
            scrollTrigger: { trigger: track, start: "top bottom", end: "bottom top", scrub: compact ? .7 : 1.15, invalidateOnRefresh: true },
          });
        });
        const parallaxScene = root.querySelector<HTMLElement>("[data-learning-parallax]");
        if (parallaxScene) {
          // One trigger and one timeline for the entire dense field. Hidden mobile
          // capsules get no tween; there are no perpetual loops or layout reads.
          const field = gsap.timeline({ scrollTrigger: { trigger: parallaxScene, start: "top bottom", end: "bottom top", scrub: 1.2, invalidateOnRefresh: true } });
          parallaxScene.querySelectorAll<HTMLElement>("[data-learning-capsule]").forEach((track) => {
            if (compact && track.dataset.mobile !== "true") return;
            const travel = () => (1 - Number(track.dataset.speed)) * (compact ? 420 : 760);
            field.fromTo(track.firstElementChild, { y: () => -travel() }, { y: travel, duration: 1, ease: "none" }, 0);
          });
        }
        root.querySelectorAll<HTMLElement>("[data-cycle-step]").forEach((step) => {
          gsap.from(step, { x: 12, opacity: .4, duration: .5, ease: "power2.out", scrollTrigger: { trigger: step, start: "top 88%", once: true } });
        });
        gsap.to(root.querySelector(`.${styles.wheelRing}`), { rotation: 70, ease: "none", scrollTrigger: { trigger: root.querySelector(`.${styles.wheel}`), start: "top bottom", end: "bottom top", scrub: .6 } });
        root.dataset.motion = "ready";
        return () => {
          ScrollTrigger.removeEventListener("refreshInit", buildJourney);
          window.removeEventListener("scroll", trackAnchor);
          orb.style.removeProperty("transform");
          journey?.kill();
          delete root.dataset.motion;
        };
      }, root);
      const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
      let frame = 0;
      const scheduleRefresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); };
      if (document.fonts.status !== "loaded") void document.fonts.ready.then(() => { if (!disposed) scheduleRefresh(); });
      // Ignore the observer's initial delivery. ScrollTrigger already handles window
      // resizes; only late content/height changes need an additional refresh here.
      let width = root.clientWidth;
      let height = root.clientHeight;
      const observer = new ResizeObserver(([entry]) => {
        const nextWidth = Math.round(entry.contentRect.width);
        const nextHeight = Math.round(entry.contentRect.height);
        if (nextWidth === width && nextHeight !== height) scheduleRefresh();
        width = nextWidth; height = nextHeight;
      });
      observer.observe(root);
      teardown = () => { cancelAnimationFrame(frame); observer.disconnect(); mm.revert(); };
    }
    // No animation-library download or observers until motion is actually wanted.
    const preference = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let started = false;
    const start = () => { if (!started && preference.matches) { started = true; void setup(); } };
    preference.addEventListener("change", start);
    start();
    return () => { disposed = true; preference.removeEventListener("change", start); teardown(); };
  }, [markers, reasons.length]);

  return (
    <div ref={rootRef} className={styles.page} dir="rtl">
      <div className={styles.bgPattern} aria-hidden><GeometricPattern opacity={.035} /></div>
      <div className={styles.chromeTop}>{header}</div>
      <main className={styles.content}>
        <div className={styles.parallaxField} aria-hidden>
          {PARALLAX_MOTES.map((mote, index) => (
            <span key={index} className={styles.parallaxTrack} data-parallax-track data-speed={mote.speed} data-mobile={mote.mobile === true}
              style={{ "--mote-x": `${mote.x}%`, "--mote-y": `${mote.y}%`, "--mote-width": `${mote.w}px`, "--mote-height": `${mote.h}px` } as CSSProperties}>
              <span className={styles.parallaxMote} data-tone={mote.tone} />
            </span>
          ))}
        </div>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}><SarvaStar size={16} /> سروا پلاس</span>
            <h1 className={styles.heroTitle}>فقط بیشتر تمرین نکن؛<br /><em>هوشمندانه‌تر پیش برو.</em></h1>
            <p className={styles.heroLede}>بدان چه چیزی را باید مرور کنی. سروا پلاس از پاسخ‌های خودت، مسیرِ یادگیریِ مخصوص تو را می‌سازد؛ با تمرین‌هایی که درست به آن‌ها نیاز داری.</p>
            <a className={styles.heroCta} href="#plans">پلن مناسب من <ArrowDown size={16} aria-hidden /></a>
            <div ref={seedRef} className={styles.heroSeed} aria-hidden><Jewel /></div>
            <p className={styles.scrollHint}>یک ستاره، همراهِ مسیر تو <ArrowDown size={13} aria-hidden /></p>
          </div>
        </header>

        <section className={styles.wheel}>
          <div className={styles.wheelCopy}>
            <span className={styles.sectionLabel}>از تمرین تا پیشرفت</span>
            <h2 className={styles.wheelTitle}>هر بار، یک قدم آگاهانه‌تر</h2>
            <p className={styles.wheelLede}>تمرین می‌کنی، خودت را بهتر می‌شناسی و این بار، دقیق‌تر ادامه می‌دهی.</p>
            <ol className={styles.cycleList}>{cycle.map((step, i) => (
              <li key={step.title} className={styles.cycleCard} data-cycle-step>
                <span className={styles.cycleIndex}>{(i + 1).toLocaleString("fa-IR")}</span>
                <span><span className={styles.cycleTitle}>{step.title}</span><span className={styles.cycleBody}>{step.body}</span></span>
              </li>
            ))}</ol>
          </div>
          <div className={styles.wheelArt} aria-hidden>
            <div className={styles.wheelRing}><i /><i /><i /></div>
            <div className={styles.wheelCore}><SarvaStar size={68} /><span>قدم‌به‌قدم، با تو</span></div>
            <span className={styles.orbitLabel}>تمرین</span><span className={styles.orbitLabel}>شناخت</span><span className={styles.orbitLabel}>پیشرفت</span>
          </div>
        </section>

        <LearningParallax />

        <div className={styles.reasonsField}>
          {reasons.map((reason, i) => {
            const Icon = REASON_ICONS[i % REASON_ICONS.length];
            return (
              <section key={reason.id} id={reason.id} className={styles.reason}>
                <div className={styles.cardSlot}>
                  <article className={styles.card} data-reason-card>
                    <span className={styles.cardAura} aria-hidden />
                    <span className={styles.cardGhost} aria-hidden>{(i + 1).toLocaleString("fa-IR")}</span>
                    <div className={styles.cardHead}><span className={styles.cardStep}><Icon size={23} aria-hidden /></span><span className={styles.cardKicker}>{(i + 1).toLocaleString("fa-IR")} از {reasons.length.toLocaleString("fa-IR")} دلیل برای پلاس</span></div>
                    <h2 className={styles.cardTitle}>{reason.title}</h2>
                    <p className={styles.cardBody}>{reason.body}</p>
                    <p className={styles.cardNote}><Sparkles size={14} aria-hidden />{reason.note}</p>
                  </article>
                </div>
              </section>
            );
          })}
        </div>

        <section className={styles.plans} id="plans">
          <div className={styles.dockScene} aria-hidden>
            <div className={styles.dockAura} data-dock-glow />
            <StarDock className={styles.dockVector} />
            <div ref={dockRef} className={styles.dockTarget} />
            <Jewel className={styles.dockFallback} />
          </div>
          <div className={styles.plansIntro}><span className={styles.sectionLabel}>جای تو در سروا پلاس</span><h2>برای قدم بعدی آماده‌ای؟</h2><p>همان یادگیری که دوست داری؛ این بار با شناختِ بیشتر.</p></div>
          <div className={styles.planContent}>{plans}</div>
        </section>
      </main>
      {footer}
      {showPath && <svg className={styles.pathSvg} aria-hidden><path ref={pathRef} className={styles.pathLine} /></svg>}
      <div className={styles.stage} aria-hidden>
        <div ref={orbRef} className={styles.orbHolder}><div ref={orbInnerRef} className={styles.orb}><Jewel className={styles.orbStar} /></div></div>
      </div>
    </div>
  );
}
