import { useId, type CSSProperties } from "react";
import styles from "./learning-scenes.module.css";

// Deliberately concentrated in one scene, with many independent depth layers.
// Positions are deterministic for SSR; small screens retain twenty capsules.
const CAPSULES = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 61 + 13) % 97,
  y: (i * 43 + 7) % 101,
  width: [12, 20, 32, 15, 26, 9, 36, 17][i % 8],
  height: [44, 116, 212, 72, 165, 30, 250, 95][i % 8],
  depth: [.4, .72, 1, .55, .86][i % 5],
  speed: [.55, 1.6, .8, 1.35, .65, 1.85][i % 6],
}));

export function LearningParallax() {
  const id = useId();
  return (
    <section id="learning-rhythm" className={styles.parallax} data-learning-parallax aria-labelledby={`${id}-title`}>
      <div className={styles.capsules} aria-hidden>
        {CAPSULES.map((capsule, i) => (
          <span key={i} className={styles.capsuleTrack} data-learning-capsule data-speed={capsule.speed} data-mobile={i % 4 < 2}
            style={{ "--x": `${capsule.x}%`, "--y": `${capsule.y}%`, "--w": `${capsule.width}px`, "--h": `${capsule.height}px`, "--depth": capsule.depth * (capsule.x > 25 && capsule.x < 75 ? .45 : 1) } as CSSProperties}>
            <i className={styles.capsule} data-gold={i % 4 === 0} />
          </span>
        ))}
      </div>
      <div className={styles.parallaxCopy} data-journey-surface>
        <span className={styles.eyebrow}>با ریتمِ خودت یاد بگیر</span>
        <h2 id={`${id}-title`}>هزار نکته.<br /><em>یک مسیر، برای تو.</em></h2>
        <p>بین این‌همه نکته و تمرین، لازم نیست همه‌چیز را از نو بخوانی.<br />سروا کمک می‌کند همان چیزی را پیدا کنی که الان به آن نیاز داری.</p>
        <div className={styles.subjects}><span>واژه و معنا</span><span>وزن و آوا</span><span>دستور زبان</span></div>
      </div>
    </section>
  );
}
