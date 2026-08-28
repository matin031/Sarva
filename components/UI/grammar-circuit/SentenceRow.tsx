"use client";

import { Fragment } from "react";
import type { GrammarCircuitToken } from "@/lib/grammar-circuit";

/** جملهٔ فارسی، دقیقاً همان‌طور که در داده آمده.
 *
 *  متن از `token.text + token.separatorAfter` بازسازی می‌شود — نه با
 *  `join(" ")`. بازی هیچ فاصله، ویرگول یا نیم‌فاصله‌ای از خودش نمی‌سازد.
 *
 *  عرضِ سوکت‌ها هیچ اثری روی این ردیف ندارد: سوکت‌ها در نوارِ جداگانه‌ای زیرِ
 *  همین متن می‌نشینند، پس «علی    کتاب    را» هرگز پیش نمی‌آید. */
export interface SentenceRowProps {
  tokens: readonly GrammarCircuitToken[];
  placements: Readonly<Record<string, string>>;
  armedTokenId: string | null;
  /** وقتی قطعه‌ای انتخاب شده، خودِ واژه هم هدفِ «لمس برای گذاشتن» است. */
  tapArmed: boolean;
  onTapToken: (tokenId: string, viaKeyboard: boolean) => void;
  /** لنگرِ اندازه‌گیری: کادرِ معناییِ محتوا از این و نوارِ سوکت‌ها می‌آید. */
  hostRef: React.RefObject<HTMLParagraphElement | null>;
  registerWord: (tokenId: string, el: HTMLElement | null) => void;
}

export default function SentenceRow({
  tokens,
  placements,
  armedTokenId,
  tapArmed,
  onTapToken,
  registerWord,
  hostRef,
}: SentenceRowProps) {
  return (
    <p ref={hostRef} className="gc-sentence">
      {tokens.map((token) => {
        if (!token.roleSlot) {
          return (
            <Fragment key={token.id}>
              <span className="gc-word gc-word-plain">{token.text}</span>
              {token.separatorAfter}
            </Fragment>
          );
        }
        const connected = Boolean(placements[token.id]);
        const selectable = tapArmed && !connected;
        return (
          <Fragment key={token.id}>
            <button
              type="button"
              ref={(el) => registerWord(token.id, el)}
              className="gc-word gc-word-slot"
              data-selectable={selectable || undefined}
              data-armed={armedTokenId === token.id || undefined}
              data-connected={connected || undefined}
              aria-label={
                connected
                  ? `واژهٔ ${token.text} — نقشش وصل شده است`
                  : `واژهٔ ${token.text} — سوکتِ خالی`
              }
              onClick={(event) => onTapToken(token.id, event.detail === 0)}
            >
              {token.text}
            </button>
            {token.separatorAfter}
          </Fragment>
        );
      })}
    </p>
  );
}
