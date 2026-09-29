"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Flame, Footprints, Star, Volume2, VolumeX } from "lucide-react";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";
import GameReportButton from "@/components/UI/games/GameReportButton";
import { GameBackButton, gameIconButton } from "@/components/UI/games/GameNav";

/* HUDـِ «پلِ وزن» — بخشِ بالاییِ *همان* پوستهٔ بازی، نه کارتی جدا.
 *
 * سه چیز و فقط سه چیز: واژهٔ پرسش (قوی‌ترین متن، چون محتوای آموزشیِ اصلی
 * است)، سه نشانِ کوچکِ وضعیت، و نوارِ زمان.
 *
 * ── کارایی ──────────────────────────────────────────────────────────────
 * نوارِ زمان هر فریم فقط `transform` می‌گیرد — ویژگی‌ای که مرورگر روی
 * کامپوزیتور و بدونِ paint جابه‌جا می‌کند. رنگ و درخشش با عبور از آستانه‌ها
 * فقط *دو بار* در هر پرسش عوض می‌شوند (`data-level`)، نه شصت بار در ثانیه.
 * نسخهٔ پیشین هر فریم `background` می‌نوشت، که هر فریم یک paint بود.
 *
 * ⚠️ هیچ `backdrop-filter`ـی روی یا کنارِ بوم نیست: تاری روی بومی که هر فریم
 * عوض می‌شود یعنی مرورگر هر فریم کلِ ناحیه را دوباره تار کند — یکی از
 * گران‌ترین کارهایی که می‌شود از GPUِ یک گوشی خواست. */

const fa = new Intl.NumberFormat("fa-IR");

/** در این حالت‌ها پرسشِ زنده‌ای در جریان است. */
const ACTIVE: ReadonlySet<GameState> = new Set<GameState>([
  "preparing",
  "showingQuestion",
  "waitingForAnswer",
  "jumping",
  "landing",
  "correct",
  "timeout",
  "cracking",
  "shattering",
  "falling",
]);

/**
 * اندازهٔ قلمِ واژه از *طولِ متن* می‌آید، نه یک عددِ ثابت: متنِ بلند کامل
 * دیده می‌شود و ارتفاعِ HUD — و در نتیجه کادرِ بازی — دست‌نخورده می‌ماند.
 */
function promptSizeClass(text: string | null, compact: boolean): string {
  const length = text?.trim().length ?? 0;
  if (compact) {
    if (length <= 12) return "text-2xl";
    if (length <= 24) return "text-xl";
    if (length <= 40) return "text-base";
    return "text-sm";
  }
  if (length <= 12) return "text-2xl sm:text-[2.1rem]";
  if (length <= 24) return "text-xl sm:text-2xl";
  if (length <= 40) return "text-base sm:text-xl";
  return "text-sm sm:text-base";
}

function Chip({
  icon,
  label,
  value,
  hot = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** زنجیرهٔ داغ: طلایی و درخشان. */
  hot?: boolean;
}) {
  return (
    <span
      className={`ab-chip ${hot ? "ab-chip-hot" : ""}`}
      aria-label={`${label}: ${value}`}
      title={label}
    >
      <span aria-hidden className="ab-chip-icon">
        {icon}
      </span>
      {/* کلید = مقدار: هر تغییر یک «پاپ» کوتاه می‌سازد، بی‌هیچ state‌ای. */}
      <span key={value} aria-hidden className="ab-chip-value tabular-nums">
        {value}
      </span>
    </span>
  );
}

/** همان ظاهرِ دکمه‌های ناوبریِ همهٔ بازی‌ها (`GameNav`)؛ روی لمسی ۴۴ پیکسل. */
function IconButton({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  return href ? (
    <Link href={href} aria-label={label} className={gameIconButton}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={gameIconButton}>
      {children}
    </button>
  );
}

function useTimerBar(
  running: boolean,
  epoch: number,
  config: AruzBridgeConfig,
): React.RefObject<HTMLDivElement | null> {
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = trackRef.current;
    const bar = track?.firstElementChild as HTMLElement | null;
    if (!track || !bar) return;
    if (!running) {
      bar.style.transform = "scaleX(1)";
      track.dataset.level = "idle";
      return;
    }
    const start = performance.now();
    let raf = 0;
    let level = "";
    const tick = () => {
      const left = Math.max(0, 1 - (performance.now() - start) / config.answerTime);
      bar.style.transform = `scaleX(${left})`;
      const next =
        left < config.panicThreshold ? "panic" : left < config.pressureThreshold ? "pressure" : "calm";
      if (next !== level) {
        level = next;
        track.dataset.level = next;
      }
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, epoch, config.answerTime, config.pressureThreshold, config.panicThreshold]);
  return trackRef;
}

export function GameHeader({
  state,
  epoch,
  config,
  promptText,
  stepIndex,
  totalSteps,
  score,
  streak,
  muted,
  onToggleMute,
  compact = false,
}: {
  state: GameState;
  epoch: number;
  config: AruzBridgeConfig;
  promptText: string | null;
  stepIndex: number;
  totalSteps: number;
  score: number;
  streak: number;
  muted: boolean;
  onToggleMute: () => void;
  /** روی موبایل نوارِ بالای جدا دکمه‌ها را دارد، پس HUD فقط محتوا می‌شود. */
  compact?: boolean;
}) {
  const trackRef = useTimerBar(state === "waitingForAnswer", epoch, config);
  const active = ACTIVE.has(state);
  const stepValue = `${fa.format(Math.min(stepIndex + 1, totalSteps))}/${fa.format(totalSteps)}`;

  const chips = (
    <>
      <Chip icon={<Footprints className="size-3.5" />} label="مرحله" value={stepValue} />
      <Chip icon={<Star className="size-3.5" />} label="امتیاز" value={fa.format(score)} />
      <Chip icon={<Flame className="size-3.5" />} label="زنجیره" value={fa.format(streak)} hot={streak >= 3} />
    </>
  );

  const word = (
    <p
      aria-live="polite"
      className={`flex items-center justify-center overflow-hidden text-center leading-tight transition-opacity duration-200 ${
        compact ? "h-8 [@media(max-height:560px)]:h-6" : "h-10 sm:h-11"
      } ${active && promptText ? "opacity-100" : "opacity-35"}`}
    >
      {/* کلید = واژه: هر پرسشِ تازه با یک ورودِ کوتاه می‌آید. */}
      <span
        key={promptText ?? "—"}
        className={`ab-word line-clamp-2 px-1 ${promptSizeClass(promptText, compact)}`}
      >
        {promptText ?? "—"}
      </span>
    </p>
  );

  const timer = (
    <div ref={trackRef} className="ab-timer" data-level="idle" aria-hidden>
      <div className="ab-timer-fill" />
    </div>
  );

  if (compact) {
    /* نسخهٔ موبایل: فقط محتوا. دکمه‌های خروج و صدا در `GameTopBar` هستند. */
    return (
      <div dir="rtl" className="ab-hud px-3 pb-2 pt-1.5 [@media(max-height:560px)]:pb-1 [@media(max-height:560px)]:pt-1">
        <p className="text-center text-[0.62rem] leading-none text-muted-foreground [@media(max-height:560px)]:hidden">
          وزنِ این واژه کدام است؟
        </p>
        {word}
        <div className="mt-1 flex items-center justify-center gap-1.5 [@media(max-height:560px)]:mt-0.5">
          {chips}
        </div>
        <div className="mt-1.5">{timer}</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="ab-hud px-3 pb-2.5 pt-2 sm:px-4">
      {/* ── چرا Grid و نه Flex ──────────────────────────────────────────────
          دو ستونِ کناری هر دو `minmax(0,1fr)`اند، یعنی *همیشه* هم‌اندازه؛ پس
          واژه ذاتاً روی مرکزِ پوسته می‌نشیند و با تغییرِ پهنای آمار نمی‌لغزد. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex items-center justify-self-start gap-2">
          <GameBackButton href="/game" compact />
          <IconButton onClick={onToggleMute} label={muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
          {/* در حالتِ جمع‌شده نوارِ بالای پوسته رندر نمی‌شود؛ راهِ گزارش همین‌جاست. */}
          <GameReportButton />
        </div>

        <div className="min-w-0 justify-self-center text-center">
          <p className="text-[0.65rem] leading-none text-muted-foreground sm:text-xs">وزنِ این واژه کدام است؟</p>
          {word}
        </div>

        <div className="hidden items-center justify-self-end gap-1.5 sm:flex">{chips}</div>
      </div>

      <div className="mt-2">{timer}</div>
    </div>
  );
}
