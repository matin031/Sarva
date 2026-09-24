"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Crown, MapPin, School, Sparkles, Trophy } from "lucide-react";
import TiltCard from "@/components/UI/aruz/TiltCard";
import { useFinePointer, useInView, useReducedMotion, useRenderGate } from "@/lib/perf/use-perf";
import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardProps } from "./types";
import styles from "./leaderboard.module.css";

const number = new Intl.NumberFormat("fa-IR");
const periods: { id: LeaderboardPeriod; label: string }[] = [
  { id: "week", label: "این هفته" },
  { id: "all-time", label: "همهٔ زمان‌ها" },
];

function initials(entry: LeaderboardEntry) {
  return `${entry.firstName.trim().slice(0, 1)}${entry.lastName.trim().slice(0, 1)}`;
}

function StudentDetails({ entry }: { entry: LeaderboardEntry }) {
  return (
    <dl className={styles.details}>
      <div><dt><MapPin aria-hidden size={12} />شهر:</dt><dd>{entry.city?.trim() || <>نگفته <bdi>:(</bdi></>}</dd></div>
      <div><dt><School aria-hidden size={12} />مدرسه:</dt><dd>{entry.school?.trim() || <>نگفته <bdi>:(</bdi></>}</dd></div>
    </dl>
  );
}

/** A small, layered metallic crown. Inline SVG keeps this local and crisp. */
function ChampionCrown() {
  const id = useId();
  return (
    <svg className={styles.crown} viewBox="0 0 100 76" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-front`} x1="18" y1="20" x2="78" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff3be" /><stop offset=".32" stopColor="#e9be5b" /><stop offset=".65" stopColor="#bc812c" /><stop offset="1" stopColor="#f5d98b" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="21" y1="54" x2="79" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9b641b" /><stop offset=".5" stopColor="#e5b55b" /><stop offset="1" stopColor="#845417" />
        </linearGradient>
      </defs>
      <path d="m16 26 8 32 28 8 29-8 7-32-22 15-14-27-15 27z" fill="#835922" />
      <path d="m12 22 10 32 28 8 28-8 10-32-23 15L50 10 35 37z" fill={`url(#${id}-front)`} stroke="#fff1ba" strokeWidth=".8" />
      <path d="m22 54 28 8 28-8v9l-28 8-28-8z" fill={`url(#${id}-edge)`} />
      <path d="m22 54 28 8 28-8M50 13v46" stroke="#fff1bb" strokeOpacity=".5" />
      <path d="m50 39 5 7-5 7-5-7z" fill="#fff4c8" />
      <circle cx="12" cy="21" r="4" fill="#f7da8c" /><circle cx="50" cy="10" r="4.5" fill="#fff0b5" /><circle cx="88" cy="21" r="4" fill="#eabe61" />
    </svg>
  );
}

function PodiumStudent({ entry, rank, scoreLabel, tilt }: { entry: LeaderboardEntry; rank: number; scoreLabel: string; tilt: boolean }) {
  return (
    <li className={styles.podiumStudent} data-rank={rank} value={rank}>
      <TiltCard className={styles.podiumCard} disabled={!tilt} max={5} glare={false}>
        <div className={styles.medalArea} aria-hidden>
          {rank === 1 && <><div className={styles.halo} /><div className={styles.orbit} /><ChampionCrown /><span className={styles.sparkleOne}>✦</span><span className={styles.sparkleTwo}>✦</span><span className={styles.sparkleThree}>✧</span></>}
          <div className={styles.medal}><span>{initials(entry)}</span><i /></div>
          <span className={styles.rankSeal}>{number.format(rank)}</span>
        </div>
        <div className={styles.studentInfo}>
          <span className={styles.rankLabel}>{rank === 1 ? "ستارهٔ اول" : rank === 2 ? "جایگاه دوم" : "جایگاه سوم"}</span>
          <h3>{entry.firstName} {entry.lastName}</h3>
          <StudentDetails entry={entry} />
        </div>
        <div className={styles.pedestal}>
          <span className={styles.pedestalTop} aria-hidden />
          <div className={styles.pedestalFront}>
            <span className={styles.pedestalNumber} aria-hidden>{number.format(rank)}</span>
            <div className={styles.podiumScore}><strong>{number.format(entry.score)}</strong><span>{scoreLabel}</span></div>
            {rank === 1 && <span className={styles.championLaurel} aria-hidden>✧</span>}
          </div>
        </div>
      </TiltCard>
    </li>
  );
}

export default function StudentLeaderboard({ variant, boards, isDemo }: LeaderboardProps) {
  const id = useId();
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ref, inView] = useInView<HTMLElement>("0px");
  const canAnimate = useRenderGate(inView);
  const reduced = useReducedMotion();
  const finePointer = useFinePointer();
  const board = boards.find((item) => item.id === boardId) ?? boards[0];
  const entries = board?.periods[period] ?? [];
  const title = variant === "games" ? "ستاره‌های کهکشان سروا" : "ستاره‌های دنیای عروض";
  const listId = `${id}-ranking`;

  return (
    <section ref={ref} id={`${variant}-leaderboard`} dir="rtl" className={styles.section} data-animate={canAnimate && !paused} data-paused={paused} aria-labelledby={`${id}-title`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}><Trophy size={15} aria-hidden />تالار افتخار<span /></p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p className={styles.subtitle}>هر بار بهتر از دیروز. این‌بار، نوبت درخشیدن توست.</p>
        </div>
        <div className={styles.headingAside}>
          {isDemo && <span className={styles.demoBadge}>پیش‌نمایش با نام‌ها و امتیازهای فرضی</span>}
          <div className={styles.periods} role="group" aria-label="بازهٔ رتبه‌بندی">
            {periods.map((item) => <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => { setPeriod(item.id); setExpanded(false); }}>{item.label}</button>)}
          </div>
        </div>
      </div>

      <div className={styles.board}>
        <div className={styles.toolbar}>
          <div className={styles.boardPicker}>
            <span className={styles.pickerIcon}><Trophy size={17} aria-hidden /></span>
            <label htmlFor={`${id}-board`} className={styles.srOnly}>انتخاب جدول رتبه‌بندی</label>
            <select id={`${id}-board`} value={board?.id ?? ""} onChange={(event) => { setBoardId(event.target.value); setExpanded(false); }}>
              {boards.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden />
          </div>
          <span className={styles.boardCaption}><Sparkles size={14} aria-hidden />{board?.description ?? "تالار افتخار سروا"}</span>
        </div>

        <div className={styles.srOnly} role="status">{board?.label}، {periods.find((item) => item.id === period)?.label}، {number.format(entries.length)} دانش‌آموز</div>
        {entries.length > 0 ? <>
          <div className={styles.stage} key={`${board?.id}-${period}`}>
            <div className={styles.stageGlow} aria-hidden />
            <div className={styles.floor} aria-hidden />
            <ol className={styles.podium} aria-label="سه دانش‌آموز برتر">
              {entries.slice(0, 3).map((entry, index) => <PodiumStudent key={entry.id} entry={entry} rank={index + 1} scoreLabel={board.scoreLabel} tilt={finePointer && !reduced && !paused} />)}
            </ol>
          </div>

          {entries.length > 3 && <div className={styles.rankings} id={listId}>
            <div className={styles.listHeading}><span>در مسیر درخشش</span><span>{board.scoreLabel}</span></div>
            <ol start={4} className={styles.list} aria-label="دیگر دانش‌آموزان برتر">
              {entries.slice(3, expanded ? undefined : 6).map((entry, index) => <li key={entry.id} className={styles.row}>
                <span className={styles.rowRank} aria-label={`رتبهٔ ${number.format(index + 4)}`}>{number.format(index + 4)}</span>
                <span className={styles.smallAvatar} data-tone={index % 3} aria-hidden>{initials(entry)}</span>
                <div className={styles.rowStudent}><h3>{entry.firstName} {entry.lastName}</h3><StudentDetails entry={entry} /></div>
                <strong className={styles.rowScore}>{number.format(entry.score)}<span className={styles.srOnly}> {board.scoreLabel}</span></strong>
              </li>)}
            </ol>
            {entries.length > 6 && <button className={styles.expand} type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>
              {expanded ? "نمایش کمتر" : `دیدن هر ${number.format(entries.length)} نفر`}{expanded ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />}
            </button>}
          </div>}
        </> : <div className={styles.empty}><Crown size={36} aria-hidden /><h3>این سکو منتظر اولین ستاره است</h3><p>هنوز امتیازی برای این بازه ثبت نشده است.</p></div>}

        <div className={styles.boardFooter}>
          <span><span className={styles.footerStar} aria-hidden>✦</span>جای تو بین ستاره‌ها خالی است.</span>
          {!reduced && <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "پخش جلوه‌ها" : "توقف جلوه‌ها"}<span className={styles.motionIndicator} aria-hidden data-paused={paused} /></button>}
        </div>
      </div>
    </section>
  );
}
