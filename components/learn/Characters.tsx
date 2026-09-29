import type { Mood } from "@/lib/learn/types";
import s from "./learn.module.css";

/** «متمم»: a word tile with a crown. Pure SVG so it stays sharp and themable;
 *  `mood` swaps the face. */
export function Motammam({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      {/* crown */}
      <path className={s.hostCrown} d="M30 30 26 10l13 11 11-15 11 15 13-11-4 20Z" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="50" cy="8" r="3" fill="#ff8fa3" stroke="var(--lx-outline)" strokeWidth="1.8" />
      {/* arms */}
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 38c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      {/* face */}
      {mood === "cool" ? <g>
        <path d="M27 50h46" stroke="var(--lx-outline)" strokeWidth="2.6" />
        <rect x="27" y="47" width="19" height="12" rx="5" fill="#241c33" />
        <rect x="54" y="47" width="19" height="12" rx="5" fill="#241c33" />
        <path d="M31 50h6M58 50h6" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      </g> : <g className={s.hostEyes}>
        {mood === "happy" && <><path d="M31 55q5-7 10 0M59 55q5-7 10 0" fill="none" stroke="#241c33" strokeWidth="3" strokeLinecap="round" /></>}
        {mood === "wow" && <><circle cx="36" cy="53" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="64" cy="53" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="36" cy="53" r="2.8" fill="#241c33" /><circle cx="64" cy="53" r="2.8" fill="#241c33" /></>}
        {mood === "think" && <><circle cx="38" cy="50" r="3.6" fill="#241c33" /><circle cx="66" cy="50" r="3.6" fill="#241c33" /><path d="M31 43l9-2M59 41l9 2" stroke="#241c33" strokeWidth="2.4" strokeLinecap="round" /></>}
      </g>}
      <ellipse cx="28" cy="67" rx="5" ry="3" fill="#f49a9a" opacity=".7" />
      <ellipse cx="72" cy="67" rx="5" ry="3" fill="#f49a9a" opacity=".7" />
      {mood === "wow" ? <ellipse cx="50" cy="74" rx="5" ry="6" fill="#241c33" />
        : mood === "think" ? <path d="M43 75h13" stroke="#241c33" strokeWidth="2.6" strokeLinecap="round" />
          : <path d={mood === "cool" ? "M42 71q10 6 17-2" : "M40 70q10 10 20 0"} fill="none" stroke="#241c33" strokeWidth="2.8" strokeLinecap="round" />}
    </g>
  </svg>;
}

/** «کَنه»: a preposition as a little bug that clings to the next word. */
export function Tick({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.tick} ${className}`}>
    <svg viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <g stroke="var(--lx-outline)" strokeWidth="2.4" strokeLinecap="round" fill="none" className={s.tickLegs}>
        <path d="M18 30 6 22M16 38 4 38M18 46 6 54M62 30l12-8M64 38h12M62 46l12 8" />
      </g>
      <ellipse cx="40" cy="38" rx="25" ry="20" fill="var(--lx-tick)" stroke="var(--lx-outline)" strokeWidth="2.6" />
      <circle cx="32" cy="16" r="6" fill="#fff" stroke="var(--lx-outline)" strokeWidth="2" />
      <circle cx="48" cy="16" r="6" fill="#fff" stroke="var(--lx-outline)" strokeWidth="2" />
      <circle cx="32" cy="17" r="2.6" fill="#241c33" />
      <circle cx="48" cy="17" r="2.6" fill="#241c33" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «ایهام»: همان کاشیِ کلمه، ولی نقاب‌دار — و دو نقابِ دیگر بالای سرش، یکی
 *  خندان و یکی عبوس. `mood` چشم‌های پشتِ نقاب و دهان را عوض می‌کند. */
export function Iham({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      {/* دو نقابِ روی دسته، که آرام تاب می‌خورند */}
      <g className={s.maskPair}>
        <g className={s.maskRight}>
          <path d="M70 26 62 14" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M72 2c7 0 11 5 11 11s-5 12-11 12-11-5-11-12S65 2 72 2Z" fill="#f7e9c9" stroke="var(--lx-outline)" strokeWidth="2.4" />
          <path d="M67 10h3M74 10h3" stroke="#241c33" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M68 17q4 4 8 0" fill="none" stroke="#241c33" strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className={s.maskLeft}>
          <path d="M30 26 38 14" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M28 2c7 0 11 5 11 11s-5 12-11 12-11-5-11-12S21 2 28 2Z" fill="#3b2f52" stroke="var(--lx-outline)" strokeWidth="2.4" />
          <path d="M23 10h3M30 10h3" stroke="#f7e9c9" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 19q4-5 8 0" fill="none" stroke="#f7e9c9" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>
      {/* دست‌ها */}
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 38c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      {/* نقابِ روی صورت؛ چشم‌ها از تویش پیدایند */}
      <path d="M22 45q28-7 56 0c1 9-3 15-11 15-6 0-8-4-17-4s-11 4-17 4c-8 0-12-6-11-15Z" fill="#3b2f52" stroke="var(--lx-outline)" strokeWidth="2.4" strokeLinejoin="round" />
      <g className={mood === "think" ? undefined : s.hostEyes}>
        {mood === "cool" && <><path d="M31 53h9M60 53h9" stroke="#f7e9c9" strokeWidth="3" strokeLinecap="round" /></>}
        {mood === "happy" && <><path d="M31 55q4-6 9 0M60 55q4-6 9 0" fill="none" stroke="#f7e9c9" strokeWidth="3" strokeLinecap="round" /></>}
        {mood === "wow" && <><circle cx="36" cy="53" r="5" fill="#f7e9c9" /><circle cx="64" cy="53" r="5" fill="#f7e9c9" /><circle cx="36" cy="53" r="2.2" fill="#241c33" /><circle cx="64" cy="53" r="2.2" fill="#241c33" /></>}
        {mood === "think" && <><circle cx="37" cy="53" r="3.4" fill="#f7e9c9" /><circle cx="63" cy="53" r="3.4" fill="#f7e9c9" /><path d="M30 46l9-2" stroke="#f7e9c9" strokeWidth="2.2" strokeLinecap="round" /></>}
      </g>
      <ellipse cx="27" cy="70" rx="5" ry="3" fill="#f49a9a" opacity=".55" />
      <ellipse cx="73" cy="70" rx="5" ry="3" fill="#f49a9a" opacity=".55" />
      {/* دهان: نصفش می‌خندد، نصفش نه — همان دو معنی */}
      {mood === "wow" ? <ellipse cx="50" cy="77" rx="5" ry="6" fill="#241c33" />
        : mood === "think" ? <path d="M42 78q8-5 15 1" fill="none" stroke="#241c33" strokeWidth="2.6" strokeLinecap="round" />
          : <path d={mood === "cool" ? "M40 75q6 7 11 0 5-5 9 1" : "M40 74q6 8 11 1 5-6 9 1"} fill="none" stroke="#241c33" strokeWidth="2.8" strokeLinecap="round" />}
    </g>
  </svg>;
}

/** کلمهٔ نقاب‌دار: رویِ کارت‌های خانهٔ ایهام، همان‌جایی که خانهٔ متمم `Tick`
 *  می‌گذارد. */
export function Masked({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.masked} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <path d="M3 6q29-7 58 0c1 9-4 16-12 16-6 0-10-5-17-5s-11 5-17 5C7 22 2 15 3 6Z" fill="#3b2f52" stroke="var(--lx-outline)" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="19" cy="11" r="3.4" fill="#f7e9c9" />
      <circle cx="45" cy="11" r="3.4" fill="#f7e9c9" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «تشبیه»: کاشیِ کلمه با یک آینهٔ دسته‌دار — و تصویرِ خودش که از تویش نگاه
 *  می‌کند. همان «این را در قالبِ آن ببین». */
export function Tashbih({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      {/* دستِ راست، بالا نگه‌داشته */}
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      {/* آینه، که آرام تاب می‌خورد */}
      <g className={s.mirror}>
        <path d="M84 40v26" stroke="var(--lx-outline)" strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx="84" cy="24" rx="14" ry="17" fill="#f7e9c9" stroke="var(--lx-outline)" strokeWidth="2.6" />
        <ellipse cx="84" cy="24" rx="9" ry="12" fill="var(--lx-host)" opacity=".55" />
        {/* بازتابِ خودش، کوچک */}
        <rect x="79" y="20" width="10" height="11" rx="3" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="1.4" />
        <circle cx="81.6" cy="24" r="1.1" fill="#241c33" />
        <circle cx="86.4" cy="24" r="1.1" fill="#241c33" />
        <path d="M81.5 27.5q2.5 2 5 0" fill="none" stroke="#241c33" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M76 15q3-4 7-5" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path d="M83 66c6-2 9-7 9-13" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 38c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      {/* صورت */}
      {mood === "cool" ? <g>
        <path d="M27 50h46" stroke="var(--lx-outline)" strokeWidth="2.6" />
        <rect x="27" y="47" width="19" height="12" rx="5" fill="#241c33" />
        <rect x="54" y="47" width="19" height="12" rx="5" fill="#241c33" />
        <path d="M31 50h6M58 50h6" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      </g> : <g className={s.hostEyes}>
        {mood === "happy" && <><path d="M31 55q5-7 10 0M59 55q5-7 10 0" fill="none" stroke="#241c33" strokeWidth="3" strokeLinecap="round" /></>}
        {mood === "wow" && <><circle cx="36" cy="53" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="64" cy="53" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="36" cy="53" r="2.8" fill="#241c33" /><circle cx="64" cy="53" r="2.8" fill="#241c33" /></>}
        {mood === "think" && <><circle cx="38" cy="52" r="3.6" fill="#241c33" /><circle cx="66" cy="52" r="3.6" fill="#241c33" /><path d="M31 44l9-2M59 42l9 2" stroke="#241c33" strokeWidth="2.4" strokeLinecap="round" /></>}
      </g>}
      <ellipse cx="27" cy="68" rx="5" ry="3" fill="#f49a9a" opacity=".65" />
      <ellipse cx="71" cy="68" rx="5" ry="3" fill="#f49a9a" opacity=".65" />
      {mood === "wow" ? <ellipse cx="49" cy="75" rx="5" ry="6" fill="#241c33" />
        : mood === "think" ? <path d="M42 76h13" stroke="#241c33" strokeWidth="2.6" strokeLinecap="round" />
          : <path d={mood === "cool" ? "M41 71q10 6 17-2" : "M39 70q10 10 20 0"} fill="none" stroke="#241c33" strokeWidth="2.8" strokeLinecap="round" />}
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ تشبیه: دو کلمه با علامتِ «مانندِ» میانشان. */
export function Likeness({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.likeness} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <path d="M6 9h22M6 17h22" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 9h22M36 17h22" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="13" r="4.5" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.2" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «نهاد»: کاشیِ کلمه زیرِ نورِ صحنه، با ستاره‌ای بالای سرش — همان کسی که
 *  جمله درباره‌اش خبر می‌دهد. دستِ چپش به خودش اشاره می‌کند: «منم!». */
export function Nahad({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      {/* نورِ صحنه */}
      <path d="M36 4h28l14 90H22Z" fill="#fff6c8" opacity=".38" />
      {/* ستاره، که آرام تاب می‌خورد */}
      <path className={s.hostCrown} d="m50 3 5 10 11 1.6-8 7.8 1.9 11L50 28.2l-9.9 5.2 1.9-11-8-7.8L45 13Z" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="2.4" strokeLinejoin="round" />
      {/* دست‌ها: یکی به خودش اشاره می‌کند */}
      <path d="M17 66c-6 2-7 8-3 11 3 2 9 1 14-3" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="34" width="72" height="62" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 44c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      {/* صورت */}
      {mood === "cool" ? <g>
        <path d="M27 55h46" stroke="var(--lx-outline)" strokeWidth="2.6" />
        <rect x="27" y="52" width="19" height="12" rx="5" fill="#241c33" />
        <rect x="54" y="52" width="19" height="12" rx="5" fill="#241c33" />
        <path d="M31 55h6M58 55h6" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      </g> : <g className={s.hostEyes}>
        {mood === "happy" && <path d="M31 60q5-7 10 0M59 60q5-7 10 0" fill="none" stroke="#241c33" strokeWidth="3" strokeLinecap="round" />}
        {mood === "wow" && <><circle cx="36" cy="58" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="64" cy="58" r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="36" cy="58" r="2.8" fill="#241c33" /><circle cx="64" cy="58" r="2.8" fill="#241c33" /></>}
        {mood === "think" && <><circle cx="38" cy="57" r="3.6" fill="#241c33" /><circle cx="66" cy="57" r="3.6" fill="#241c33" /><path d="M31 49l9-2M59 47l9 2" stroke="#241c33" strokeWidth="2.4" strokeLinecap="round" /></>}
      </g>}
      <ellipse cx="28" cy="71" rx="5" ry="3" fill="#f49a9a" opacity=".7" />
      <ellipse cx="72" cy="71" rx="5" ry="3" fill="#f49a9a" opacity=".7" />
      {mood === "wow" ? <ellipse cx="50" cy="79" rx="5" ry="6" fill="#241c33" />
        : mood === "think" ? <path d="M43 80h13" stroke="#241c33" strokeWidth="2.6" strokeLinecap="round" />
          : <path d={mood === "cool" ? "M42 76q10 6 17-2" : "M40 75q10 10 20 0"} fill="none" stroke="#241c33" strokeWidth="2.8" strokeLinecap="round" />}
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ نهاد: کلمه زیرِ یک ستاره — «جمله دربارهٔ این است». */
export function Spotlit({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <path d="M22 25 28 4h8l6 21Z" fill="#fff6c8" opacity=".6" />
      <path d="m32 1 3 6 6.6 1-4.8 4.6 1.1 6.6L32 16l-5.9 3.2 1.1-6.6L22.4 8l6.6-1Z" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** چشم و دهانِ مشترکِ شخصیت‌های تازه؛ `y` ارتفاعِ خطِ چشم است. */
function FaceParts({ mood, y }: { mood: Mood; y: number }) {
  return <>
    {mood === "cool" ? <g>
      <path d={`M27 ${y - 3}h46`} stroke="var(--lx-outline)" strokeWidth="2.6" />
      <rect x="27" y={y - 6} width="19" height="12" rx="5" fill="#241c33" />
      <rect x="54" y={y - 6} width="19" height="12" rx="5" fill="#241c33" />
      <path d={`M31 ${y - 3}h6M58 ${y - 3}h6`} stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </g> : <g className={s.hostEyes}>
      {mood === "happy" && <path d={`M31 ${y + 2}q5-7 10 0M59 ${y + 2}q5-7 10 0`} fill="none" stroke="#241c33" strokeWidth="3" strokeLinecap="round" />}
      {mood === "wow" && <><circle cx="36" cy={y} r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="64" cy={y} r="6" fill="#fff" stroke="#241c33" strokeWidth="2" /><circle cx="36" cy={y} r="2.8" fill="#241c33" /><circle cx="64" cy={y} r="2.8" fill="#241c33" /></>}
      {mood === "think" && <><circle cx="38" cy={y - 1} r="3.6" fill="#241c33" /><circle cx="66" cy={y - 1} r="3.6" fill="#241c33" /><path d={`M31 ${y - 8}l9-2M59 ${y - 10}l9 2`} stroke="#241c33" strokeWidth="2.4" strokeLinecap="round" /></>}
    </g>}
    <ellipse cx="28" cy={y + 13} rx="5" ry="3" fill="#f49a9a" opacity=".7" />
    <ellipse cx="72" cy={y + 13} rx="5" ry="3" fill="#f49a9a" opacity=".7" />
    {mood === "wow" ? <ellipse cx="50" cy={y + 21} rx="5" ry="6" fill="#241c33" />
      : mood === "think" ? <path d={`M43 ${y + 22}h13`} stroke="#241c33" strokeWidth="2.6" strokeLinecap="round" />
        : <path d={mood === "cool" ? `M42 ${y + 18}q10 6 17-2` : `M40 ${y + 17}q10 10 20 0`} fill="none" stroke="#241c33" strokeWidth="2.8" strokeLinecap="round" />}
  </>;
}

/** «مفعول»: کاشیِ کلمه با یک سیبلِ روی سینه و تیری که درست وسطش نشسته —
 *  همان کسی یا چیزی که کارِ فعل «به او می‌خورد». */
export function Mafool({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 38c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      <FaceParts mood={mood} y={53} />
      {/* سیبلِ کوچک روی شکم */}
      <circle cx="50" cy="86" r="7" fill="#fff" stroke="var(--lx-outline)" strokeWidth="2" />
      <circle cx="50" cy="86" r="4" fill="#e0736e" />
      <circle cx="50" cy="86" r="1.6" fill="#fff" />
      {/* تیری که از بالا آمده و در گوشهٔ سر نشسته */}
      <g className={s.hostCrown}>
        <path d="M78 30 94 8" stroke="var(--lx-outline)" strokeWidth="3" strokeLinecap="round" />
        <path d="m90 6 8-4-2 8Z" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m94 8 5 1M92 11l3 4" stroke="#e0736e" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ مفعول: کلمه زیرِ یک سیبل. */
export function Target({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <circle cx="32" cy="13" r="11" fill="#fff" stroke="var(--lx-outline)" strokeWidth="2" />
      <circle cx="32" cy="13" r="7" fill="#e0736e" />
      <circle cx="32" cy="13" r="3" fill="#fff" />
      <path d="M52 2 34 12" stroke="var(--lx-outline)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «مجاز»: کاشیِ کلمه با عینکِ واقعیتِ مجازی روی پیشانی و موجِ وای‌فای بالای
 *  سرش — همان شوخیِ «دوره، دورهٔ ماست». */
export function Majaz({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      <g className={s.hostCrown} fill="none" stroke="var(--lx-outline)" strokeWidth="3" strokeLinecap="round">
        <path d="M36 14q14-12 28 0" />
        <path d="M41 19q9-7 18 0" />
        <circle cx="50" cy="23" r="2.4" fill="var(--lx-outline)" />
      </g>
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      {/* عینکِ واقعیتِ مجازی، بالا زده */}
      <path d="M14 38h72" stroke="var(--lx-outline)" strokeWidth="3" />
      <rect x="26" y="31" width="48" height="13" rx="6" fill="#3b2f52" stroke="var(--lx-outline)" strokeWidth="2.4" />
      <path d="M31 36h14" stroke="#8ec5ff" strokeWidth="2.4" strokeLinecap="round" />
      <FaceParts mood={mood} y={58} />
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ مجاز: دو پیکانِ جابه‌جایی — «این را گفت، آن را خواست». */
export function Swap({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <path d="M12 8h38m-7-6 7 6-7 6" fill="none" stroke="var(--lx-outline)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 19H14m7-6-7 6 7 6" fill="none" stroke="#8ec5ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «استعاره»: کاشیِ کلمه با یالِ شیر — شباهتی که قرض گرفته و به جای
 *  خودش پوشیده. */
export function Esteare({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  const mane = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2, r = 44;
    return `${50 + Math.cos(a) * r},${61 + Math.sin(a) * r * .9}`;
  });
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      <g className={s.maskPair}>
        <path d={`M${mane.map((p, i) => i % 2 ? p : `${50 + (+p.split(",")[0] - 50) * .8},${61 + (+p.split(",")[1] - 61) * .8}`).join("L")}Z`} fill="#e59a3a" stroke="var(--lx-outline)" strokeWidth="2.4" strokeLinejoin="round" />
      </g>
      <path d="M17 70c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 70c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="18" y="30" width="64" height="62" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M26 40c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      <FaceParts mood={mood} y={55} />
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ استعاره: کلمه زیرِ یک یالِ کوچک. */
export function Mane({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <circle cx="32" cy="13" r="11" fill="#e59a3a" stroke="var(--lx-outline)" strokeWidth="2" strokeDasharray="4 2" />
      <circle cx="32" cy="13" r="6.5" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="1.8" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «حسن تعلیل»: کاشیِ کلمه با لامپی بالای سر — همان «آهان، پس به این خاطر!». */
export function HosnTalil({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <g className={s.hostBody}>
      <g className={s.hostCrown}>
        <path d="M50 2v4M36 7l3 3M64 7l-3 3M30 19h4M66 19h4" stroke="#f5c542" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M50 8a10 10 0 0 0-6 18v3h12v-3a10 10 0 0 0-6-18Z" fill="#fff3b0" stroke="var(--lx-outline)" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M45 30h10" stroke="var(--lx-outline)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="34" width="72" height="62" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <path d="M22 44c2-4 6-6 10-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
      <FaceParts mood={mood} y={58} />
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ حسن تعلیل: یک لامپِ کوچک. */
export function Bulb({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <path d="M32 2a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14Z" fill="#fff3b0" stroke="var(--lx-outline)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M28 23h8M20 8h3M41 8h3" stroke="var(--lx-outline)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
    <b>{label}</b>
  </span>;
}

/** «متناقض‌نما»: کاشیِ کلمه‌ای که نصفش روز است و نصفش شب — دو وصفِ ناسازگار
 *  روی یک صورت. */
export function Paradox({ mood = "happy", className = "" }: { mood?: Mood; className?: string }) {
  return <svg className={`${s.host} ${className}`} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <defs><clipPath id="paradox-half"><rect x="50" y="0" width="50" height="110" /></clipPath></defs>
    <g className={s.hostBody}>
      <g className={s.hostCrown}>
        <circle cx="36" cy="14" r="7" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="2" />
        <path d="M68 7a8 8 0 1 0 5 13 7 7 0 0 1-5-13Z" fill="#3b2f52" stroke="var(--lx-outline)" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <path d="M17 66c-7 1-11 6-11 12" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <path className={mood === "wow" ? s.hostWave : undefined} d="M83 66c7-2 11-8 11-15" fill="none" stroke="var(--lx-outline)" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="var(--lx-host)" stroke="var(--lx-outline)" strokeWidth="2.8" />
      <rect x="14" y="28" width="72" height="66" rx="20" fill="#3b2f52" opacity=".28" clipPath="url(#paradox-half)" />
      <path d="M50 30v62" stroke="var(--lx-outline)" strokeWidth="1.6" strokeDasharray="3 4" opacity=".6" />
      <FaceParts mood={mood} y={53} />
    </g>
  </svg>;
}

/** روی کارت‌های خانهٔ متناقض‌نما: دایره‌ای نیمه‌روشن، نیمه‌تاریک. */
export function HalfMoon({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`${s.spotlit} ${className}`}>
    <svg viewBox="0 0 64 26" aria-hidden="true" focusable="false">
      <circle cx="32" cy="13" r="10" fill="#f5c542" stroke="var(--lx-outline)" strokeWidth="2" />
      <path d="M32 3a10 10 0 0 1 0 20Z" fill="#3b2f52" />
    </svg>
    <b>{label}</b>
  </span>;
}
