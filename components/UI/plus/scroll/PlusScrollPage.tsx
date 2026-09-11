"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowDown, AudioLines, BookOpen, ChartNoAxesCombined, Focus, Network, Sparkles } from "lucide-react";
import { GeometricPattern } from "@/components/persian-patterns";
import SarvaStar, { SARVA_STAR_PATH } from "@/components/UI/SarvaStar";
import styles from "./plus-scroll.module.css";

export type Reason = { id: string; title: string; body: string; note: string };
export type CycleStep = { title: string; body: string };
const REASON_ICONS = [AudioLines, Network, BookOpen, Focus, ChartNoAxesCombined];

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
        const buildJourney = () => {
          journey?.kill();
          const bounds = root.getBoundingClientRect();
          const center = (el: HTMLElement) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2 - bounds.left, y: r.top + r.height / 2 - bounds.top };
          };
          const from = center(seed);
          const to = center(dock);
          const points = [from];
          const pad = compact ? 16 : 30;
          cards.forEach((card, index) => {
            // Measure the static slot: entrance transforms must never move the route.
            const r = card.parentElement!.getBoundingClientRect();
            const left = Math.max(compact ? 14 : 24, r.left - bounds.left - pad);
            const right = Math.min(bounds.width - (compact ? 14 : 24), r.right - bounds.left + pad);
            const edge = compact ? right : index % 2 === 0 ? left : right;
            const top = r.top - bounds.top;
            const bottom = r.bottom - bounds.top;
            points.push(
              { x: r.left - bounds.left + r.width / 2, y: top - 55 },
              { x: edge, y: top - 8 },
              { x: edge, y: bottom + 8 },
              { x: r.left - bounds.left + r.width / 2, y: bottom + 55 },
            );
          });
          points.push({ x: to.x, y: to.y - 150 }, to);
          // Monotonic vertical motion keeps the star alongside the current content.
          const ordered = points.filter((p, i) => i === 0 || p.y > points[i - 1].y);
          const distance = to.y - from.y;
          gsap.set(orb, { x: from.x, y: from.y, xPercent: -50, yPercent: -50, opacity: 1 });
          gsap.set(inner, { scale: compact ? 1.05 : 1.4, rotation: 0, rotationX: 0 });
          gsap.set(glow, { opacity: 0 });
          gsap.set(seed, { opacity: 0 });
          journey = gsap.timeline({ paused: true });
          journey.to(orb, { y: to.y, duration: distance, ease: "none" }, 0);
          for (let i = 1; i < ordered.length; i++) {
            const previous = ordered[i - 1];
            const point = ordered[i];
            journey.to(orb, { x: point.x, duration: point.y - previous.y, ease: "sine.inOut" }, previous.y - from.y);
          }
          journey.to(inner, { scale: compact ? .65 : .95, duration: 170, ease: "sine.out" }, 0);
          journey.to(inner, { scale: 2.25, rotationX: 48, rotation: 0, duration: 150, ease: "sine.inOut" }, distance - 150);
          journey.to(glow, { opacity: 1, duration: 28, ease: "sine.in" }, distance - 28);
          startScroll = Math.max(0, bounds.top + window.scrollY + from.y - window.innerHeight * .77);
          endScroll = Math.max(startScroll + 1, bounds.top + window.scrollY + to.y - window.innerHeight * .5);
          if (pathRef.current) pathRef.current.setAttribute("d", ordered.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "));
          journey.progress(Math.max(0, Math.min(1, (window.scrollY - startScroll) / (endScroll - startScroll))));
        };
        buildJourney();
        // The small proxy lets refresh replace the measured timeline without attaching
        // multiple scrub controllers to the star. No DOM reads happen during scrolling.
        const playhead = { progress: 0 };
        const scrub = gsap.to(playhead, { progress: 1, ease: "none", paused: true, onUpdate: () => { journey?.progress(playhead.progress); } });
        ScrollTrigger.create({ animation: scrub, start: () => startScroll, end: () => endScroll, scrub: .45, invalidateOnRefresh: true, markers, id: "plus-journey" });
        ScrollTrigger.addEventListener("refreshInit", buildJourney);
        cards.forEach((card) => {
          gsap.from(card, { y: 22, opacity: .35, duration: .65, ease: "power2.out", scrollTrigger: { trigger: card.parentElement, start: "top 90%", once: true } });
        });
        root.querySelectorAll<HTMLElement>("[data-cycle-step]").forEach((step) => {
          gsap.from(step, { x: 12, opacity: .4, duration: .5, ease: "power2.out", scrollTrigger: { trigger: step, start: "top 88%", once: true } });
        });
        gsap.to(root.querySelector(`.${styles.wheelRing}`), { rotation: 70, ease: "none", scrollTrigger: { trigger: root.querySelector(`.${styles.wheel}`), start: "top bottom", end: "bottom top", scrub: .6 } });
        root.dataset.motion = "ready";
        return () => {
          ScrollTrigger.removeEventListener("refreshInit", buildJourney);
          journey?.kill();
          delete root.dataset.motion;
        };
      }, root);
      const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
      void document.fonts.ready.then(refresh);
      // ResizeObserver covers late announcements, responsive wrapping and content changes.
      let frame = 0;
      const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); });
      observer.observe(root);
      teardown = () => { cancelAnimationFrame(frame); observer.disconnect(); mm.revert(); };
    }
    void setup();
    return () => { disposed = true; teardown(); };
  }, [markers, reasons.length]);

  return (
    <div ref={rootRef} className={styles.page} dir="rtl">
      <div className={styles.bgPattern} aria-hidden><GeometricPattern opacity={.035} /></div>
      <div className={styles.chromeTop}>{header}</div>
      <main>
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

        <div className={styles.reasonsField}>
          {reasons.map((reason, i) => {
            const Icon = REASON_ICONS[i % REASON_ICONS.length];
            return (
              <section key={reason.id} id={reason.id} className={styles.reason}>
                <div className={styles.cardSlot}>
                  <article className={styles.card} data-reason-card>
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
            <div className={styles.dockBase} />
            <div className={styles.dockBaseLight} data-dock-glow />
            <div ref={dockRef} className={styles.dockTarget}>
              <SarvaStar className={styles.socketDepth} />
              <SarvaStar className={styles.socketRim} />
              <SarvaStar className={styles.socketInset} />
              <SarvaStar className={styles.socketLight} data-dock-glow />
              <Jewel className={styles.dockFallback} />
            </div>
            <span className={styles.dockDot} /><span className={styles.dockDot} /><span className={styles.dockDot} />
          </div>
          <div className={styles.plansIntro}><span className={styles.sectionLabel}>جای تو در سروا پلاس</span><h2>برای قدم بعدی آماده‌ای؟</h2><p>همان یادگیری که دوست داری؛ این بار با شناختِ بیشتر.</p></div>
          <div className={styles.planContent}>{plans}</div>
        </section>
      </main>
      {footer}
      <div className={styles.stage} aria-hidden>
        {showPath && <svg className={styles.pathSvg}><path ref={pathRef} className={styles.pathLine} /></svg>}
        <div ref={orbRef} className={styles.orbHolder}><div ref={orbInnerRef} className={styles.orb}><Jewel className={styles.orbStar} /></div></div>
      </div>
    </div>
  );
}
