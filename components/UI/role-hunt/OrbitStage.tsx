"use client";

import { Fragment } from "react";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import type { RoleHuntLine, RoleHuntRound, RoleHuntToken } from "@/lib/role-hunt/types";

/** Repeated words are distinct occurrences, including for screen readers. */
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

function tokenState(
  tokenId: string,
  correctTokenId: string,
  answered: { tokenId: string | null; isCorrect: boolean } | null,
): "correct" | "wrong" | "reveal" | undefined {
  if (!answered) return undefined;
  if (tokenId === answered.tokenId) return answered.isCorrect ? "correct" : "wrong";
  if (!answered.isCorrect && tokenId === correctTokenId) return "reveal";
  return undefined;
}

/** One short outline pulse; reduced-motion users get only color and a check mark. */
export function TokenBurst() {
  return <span className="rh-burst" aria-hidden="true"><span className="rh-burst-ring" /></span>;
}

function VerseLine({ line, activeTokenId, revealTokenId }: {
  line: RoleHuntLine;
  activeTokenId: string | null;
  revealTokenId: string | null;
}) {
  return (
    <p className="rh-verse-line">
      {line.map((token, index) => (
        <Fragment key={token.id}>
          <span className="rh-word"
            data-active={token.id === activeTokenId ? "true" : undefined}
            data-answer={token.id === revealTokenId ? "correct" : undefined}
          >{token.text}</span>
          {index < line.length - 1 ? token.separatorAfter : ""}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * The orbit remains entirely in CSS. A rotating arm and counter-rotating tile
 * share their negative delay, so hover renders never restart the motion.
 * CSS places the poem above a narrow stage, or inside the wider desktop / phone
 * landscape ellipse. Its inverse horizontal scale keeps every word upright.
 */
export default function OrbitStage({
  round, answered, hoveredTokenId, onHover, onSelect, correctTokenId,
  reading = false, readSeconds = 12, locked = false, center,
}: {
  round: RoleHuntRound;
  answered: { tokenId: string | null; isCorrect: boolean } | null;
  hoveredTokenId: string | null;
  onHover: (tokenId: string | null) => void;
  onSelect: (tokenId: string) => void;
  correctTokenId: string;
  reading?: boolean;
  readSeconds?: number;
  locked?: boolean;
  center?: React.ReactNode;
}) {
  const labels = occurrenceLabels(round.orbit);
  const count = round.orbit.length;
  // Match by occurrence ID, never text: a poem can contain the same word twice.
  const revealTokenId = answered && !answered.isCorrect ? correctTokenId : null;

  return (
    <div className="rh-stage" data-feedback={answered ? (answered.isCorrect ? "correct" : "wrong") : undefined}>
      <div className="rh-center">
        <div className="rh-panel" data-reading={reading ? "true" : undefined}>
          {reading && (
            <svg className="rh-panel-timer" aria-hidden="true" focusable="false">
              <rect x="1" y="1" rx="18" width="calc(100% - 2px)" height="calc(100% - 2px)"
                pathLength="1" style={{ "--rh-read": `${readSeconds}s` } as React.CSSProperties} />
            </svg>
          )}
          <div className="rh-verse-lines game-verse" data-lines={round.lines.length}>
            {round.lines.map((line, index) => (
              <VerseLine key={index} line={line} activeTokenId={hoveredTokenId} revealTokenId={revealTokenId} />
            ))}
          </div>
        </div>
        {center}
      </div>
      <div className="rh-orbit-field">
        <div className="rh-ring" aria-hidden="true" />
        <div className="rh-orbit">
          {round.orbit.map((token, index) => {
            const share = index / count;
            const state = tokenState(token.id, correctTokenId, answered);
            return (
              <div key={token.id} className="rh-orbit-item" style={{
                "--rh-delay": `${(-share * ROLE_HUNT_CONFIG.orbitSeconds).toFixed(3)}s`,
                "--rh-angle": `${share.toFixed(4)}turn`,
              } as React.CSSProperties}>
                <div className="rh-orbit-arm">
                  <div className="rh-upright">
                    <button type="button" className="rh-token" data-state={state}
                      disabled={answered !== null || locked}
                      onPointerEnter={() => onHover(token.id)}
                      onPointerLeave={() => onHover(null)}
                      onFocus={() => onHover(token.id)}
                      onBlur={() => onHover(null)}
                      onClick={() => onSelect(token.id)}
                      aria-label={labels.get(token.id) ?? token.text}
                    >
                      <span className="rh-token-text">{token.text}</span>
                      {state === "correct" && <TokenBurst />}
                      {state && <span className="rh-token-mark" aria-hidden="true">{state === "wrong" ? "✕" : "✓"}</span>}
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
