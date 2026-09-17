"use client";

import { Fragment } from "react";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import type { RoleHuntLine, RoleHuntRound, RoleHuntToken } from "@/lib/role-hunt/types";

/**
 * صحنهٔ بازی: مصراع و مدارِ واژه‌ها.
 *
 * ⚠️ چیدمان دو حالت دارد و هر دو از همین یک درخت درمی‌آیند: روی گوشی تابلو
 * بالای مدار می‌نشیند و مرکزِ مدار خالی می‌ماند؛ از ۴۰rem به بالا تابلو
 * می‌رود وسطِ حلقه. هیچ شرطی در JavaScript نیست — تفاوت فقط دو قاعده در
 * `role-hunt.css` است، و دلیلِ هندسی‌اش همان‌جا با عدد نوشته شده.
 *
 * ⚠️ هیچ فریمی از این کامپوننت رد نمی‌شود.
 *
 * حرکت کاملاً در CSS است (`role-hunt.css` → `rh-spin` / `rh-spin-back`) و
 * React فقط زاویهٔ شروعِ هر واژه را یک بار به‌صورتِ `animation-delay` می‌نویسد.
 * پس رندرِ دوبارهٔ این درخت — که با hover و با بازخوردِ پاسخ اتفاق می‌افتد —
 * روی حرکت هیچ اثری ندارد: نه می‌پراندش و نه از نو شروعش می‌کند.
 *
 * ⚠️ چرا `animation-delay`ِ منفی و نه `animation-timeline` یا JS:
 * تأخیرِ منفی یعنی «انگار این انیمیشن از قبل شروع شده بود». هر واژه سهمِ
 * خودش از یک دورِ کامل را عقب می‌افتد، پس همه روی یک دایره پخش می‌شوند بی
 * آنکه لازم باشد کسی موقعیتشان را حساب کند — و چون هر سه لایه یک
 * `--rh-delay` را به ارث می‌برند، چرخش و چرخشِ معکوس همیشه هم‌فازند.
 */

/**
 * شمارهٔ رخداد برای واژه‌های تکراری.
 *
 * ⚠️ فقط برای صفحه‌خوان. یک مصراع می‌تواند دو بار «بود» داشته باشد و روی
 * صفحه چشم از روی موقعیتِ ستاره تشخیصشان می‌دهد؛ کسی که با صفحه‌خوان بازی
 * می‌کند دو دکمهٔ کاملاً هم‌نام می‌شنود و راهی برای تفکیکشان ندارد.
 */
function occurrenceLabels(tokens: readonly RoleHuntToken[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token.text, (counts.get(token.text) ?? 0) + 1);

  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const token of tokens) {
    if ((counts.get(token.text) ?? 0) < 2) {
      labels.set(token.id, token.text);
      continue;
    }
    const nth = (seen.get(token.text) ?? 0) + 1;
    seen.set(token.text, nth);
    labels.set(token.id, `${token.text} — رخدادِ ${nth.toLocaleString("fa-IR")}`);
  }
  return labels;
}

/** وضعیتِ دیداریِ یک ستاره بعد از پاسخ. */
function tokenState(
  tokenId: string,
  round: RoleHuntRound,
  answered: { tokenId: string; isCorrect: boolean } | null,
): "correct" | "wrong" | "reveal" | undefined {
  if (!answered) return undefined;
  if (tokenId === answered.tokenId) return answered.isCorrect ? "correct" : "wrong";
  // پاسخِ درست فقط وقتی رو می‌شود که کاربر اشتباه زده باشد.
  if (!answered.isCorrect && tokenId === round.correctTokenId) return "reveal";
  return undefined;
}

function VerseLine({
  line,
  activeTokenId,
  revealTokenId,
}: {
  line: RoleHuntLine;
  activeTokenId: string | null;
  revealTokenId: string | null;
}) {
  return (
    <p className="rh-verse-line">
      {line.map((token, index) => (
        <Fragment key={token.id}>
          <span
            className="rh-word"
            data-active={token.id === activeTokenId ? "true" : undefined}
            data-answer={token.id === revealTokenId ? "correct" : undefined}
          >
            {token.text}
          </span>
          {/* جداکنندهٔ آخرینِ هر خط همان چیزی است که خط را شکسته؛ دوباره
              نوشتنش یک « / » اضافه به انتهای مصراع می‌داد. */}
          {index < line.length - 1 ? token.separatorAfter : ""}
        </Fragment>
      ))}
    </p>
  );
}

export default function OrbitStage({
  round,
  answered,
  hoveredTokenId,
  onHover,
  onSelect,
}: {
  round: RoleHuntRound;
  /** پاسخِ همین دور، اگر داده شده. تا وقتی `null` است، ستاره‌ها فعال‌اند. */
  answered: { tokenId: string; isCorrect: boolean } | null;
  hoveredTokenId: string | null;
  onHover: (tokenId: string | null) => void;
  onSelect: (tokenId: string) => void;
}) {
  const labels = occurrenceLabels(round.orbit);
  const count = round.orbit.length;

  /* ⚠️ رخدادِ متناظر در مصراع، نه واژهٔ هم‌املا. مقایسه روی `id` است و نه
     روی متن — وگرنه بردنِ اشاره‌گر روی «بودِ» دوم، «بودِ» اول را هم روشن
     می‌کرد و دقیقاً همان چیزی را که این بازی می‌آموزد نقض می‌کرد. */
  const revealTokenId = answered && !answered.isCorrect ? round.correctTokenId : null;

  return (
    <div className="rh-stage">
      <div className="rh-panel">
        <div className="rh-verse-lines game-verse" data-lines={round.lines.length}>
          {round.lines.map((line, index) => (
            <VerseLine
              key={index}
              line={line}
              activeTokenId={hoveredTokenId}
              revealTokenId={revealTokenId}
            />
          ))}
        </div>
      </div>

      {/* ⚠️ جعبهٔ مدار یک لایهٔ *اضافی* است و لازم.

          روی گوشی جای خودش را در ستون می‌گیرد (تابلو بالا، مدار پایین) و
          روی صفحهٔ بزرگ `absolute; inset: 0` می‌شود تا مرکزش با مرکزِ صحنه
          یکی شود و تابلو وسطِ حلقه بنشیند. بدونِ آن، یک عنصر نمی‌توانست
          هم‌زمان هر دو نقش را بازی کند. دلیلِ کاملش بالای `role-hunt.css`. */}
      <div className="rh-orbit-field">
        <div className="rh-orbit">
          {round.orbit.map((token, index) => {
            const share = index / count;
            const state = tokenState(token.id, round, answered);

            return (
              <div
                key={token.id}
                className="rh-orbit-item"
                style={
                  {
                    "--rh-delay": `${(-share * ROLE_HUNT_CONFIG.orbitSeconds).toFixed(3)}s`,
                    /* فقط در حالتِ «حرکتِ کمتر» خوانده می‌شود: همان زاویه‌ای
                       که تأخیر می‌ساخت، این بار ثابت. */
                    "--rh-angle": `${share.toFixed(4)}turn`,
                  } as React.CSSProperties
                }
              >
                <div className="rh-orbit-arm">
                  <div className="rh-upright">
                    <button
                      type="button"
                      className="rh-token"
                      data-state={state}
                      disabled={answered !== null}
                      onPointerEnter={() => onHover(token.id)}
                      onPointerLeave={() => onHover(null)}
                      onFocus={() => onHover(token.id)}
                      onBlur={() => onHover(null)}
                      onClick={() => onSelect(token.id)}
                      aria-label={labels.get(token.id) ?? token.text}
                    >
                      {token.text}
                      {state && (
                        /* ⚠️ نشانه، و نه فقط رنگ. */
                        <span className="rh-token-mark" aria-hidden="true">
                          {state === "wrong" ? "✕" : "✓"}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
