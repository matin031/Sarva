import s from "./timeline.module.css";

/** «قلمی»: a reed pen with a face that walks the timeline road.
 *  Pure SVG so it stays sharp at any size and takes the chapter colour
 *  through `--era-color` on its band. `waving` lifts the left arm. */
export function Mascot({ waving = false, className = "" }: { waving?: boolean; className?: string }) {
  return <svg className={`${s.mascot} ${className}`} viewBox="0 0 64 96" aria-hidden="true" focusable="false">
    <g className={s.mascotBody}>
      <path className={waving ? s.mascotWave : undefined} d="M13 45c-6-2-9-8-8-14" fill="none" stroke="var(--tl-outline)" strokeWidth="3" strokeLinecap="round" />
      <circle className={waving ? s.mascotWave : undefined} cx="5" cy="30" r="3.4" fill="#f6dcae" stroke="var(--tl-outline)" strokeWidth="2" />
      <path d="M51 45c5 2 8 6 7 11" fill="none" stroke="var(--tl-outline)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="58" cy="57" r="3.4" fill="#f6dcae" stroke="var(--tl-outline)" strokeWidth="2" />
      <path d="M19 64h26l-11.4 26.5c-.7 1.6-2.5 1.6-3.2 0Z" fill="#3a3150" stroke="var(--tl-outline)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 70v13" stroke="#f6dcae" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      <rect x="17" y="4" width="30" height="62" rx="15" fill="#f1c98d" stroke="var(--tl-outline)" strokeWidth="2.6" />
      <path d="M22 10c2-3 5-4 8-4" fill="none" stroke="#fff6e3" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
      <rect x="18.3" y="50" width="27.4" height="8" fill="var(--era-color)" />
      <path d="M18.3 50h27.4M18.3 58h27.4" stroke="var(--tl-outline)" strokeWidth="2" />
      <g className={s.mascotEyes}>
        <ellipse cx="26" cy="28" rx="3.4" ry="4.2" fill="#2b2440" />
        <ellipse cx="38" cy="28" rx="3.4" ry="4.2" fill="#2b2440" />
        <circle cx="27.2" cy="26.4" r="1.3" fill="#fff" />
        <circle cx="39.2" cy="26.4" r="1.3" fill="#fff" />
      </g>
      <ellipse cx="21.5" cy="36" rx="3.4" ry="2.2" fill="#f49a9a" opacity=".75" />
      <ellipse cx="42.5" cy="36" rx="3.4" ry="2.2" fill="#f49a9a" opacity=".75" />
      <path d="M28 36.5c2.2 2.4 5.8 2.4 8 0" fill="none" stroke="#2b2440" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>;
}
