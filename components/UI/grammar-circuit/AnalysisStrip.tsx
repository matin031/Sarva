"use client";

import { Fragment } from "react";
import type { GrammarCircuitToken } from "@/lib/grammar-circuit";
import type { SlotValidation } from "@/lib/grammar-circuit/reducer";

/** ردیفِ تحلیل — هر واژه و سوکتش در یک ستونِ مشترک.
 *
 *  این ساختار جایگزینِ «جمله را بکش، بعد مرکزِ واژه‌ها را حدس بزن، بعد
 *  سوکت‌ها را جایی نزدیکش بچین» است. حالا واژه و سوکتش دو فرزندِ یک ستون‌اند،
 *  پس هم‌مرکزی‌شان *ساختاری* است و خطایش صفر — نه حل‌کنندهٔ هم‌پوشانی لازم
 *  است، نه خطِ راهنما.
 *
 *  متنِ اینجا نسخهٔ فشرده و تحلیلیِ سؤال است و از نظر دیداری زیردستِ
 *  `QuestionRegion` می‌ماند. چون همان متن بالاتر کامل آمده، این ردیف برای
 *  صفحه‌خوان `aria-hidden` است تا جمله دوبار خوانده نشود؛ خودِ سوکت‌ها
 *  دکمه‌های برچسب‌دار و در دسترس‌اند. */
export interface AnalysisStripProps {
  tokens: readonly GrammarCircuitToken[];
  placements: Readonly<Record<string, string>>;
  validation: Readonly<Record<string, SlotValidation>>;
  lockedTokenIds: readonly string[];
  labelForPiece: (pieceId: string) => string;
  activeTargetTokenId: string | null;
  /** قطعه‌ای در سینی انتخاب شده و منتظرِ خانه است. */
  armed: boolean;
  interactive: boolean;
  freshTokenId: string | null;
  onSocketActivate: (tokenId: string, viaKeyboard: boolean) => void;
  registerSocket: (tokenId: string, el: HTMLElement | null) => void;
  registerHitTarget: (tokenId: string, el: HTMLElement | null) => void;
  stripRef: React.RefObject<HTMLDivElement | null>;
}

export default function AnalysisStrip({
  tokens,
  placements,
  validation,
  lockedTokenIds,
  labelForPiece,
  activeTargetTokenId,
  armed,
  interactive,
  freshTokenId,
  onSocketActivate,
  registerSocket,
  registerHitTarget,
  stripRef,
}: AnalysisStripProps) {
  return (
    <div ref={stripRef} className="gc-strip" dir="rtl">
      {tokens.map((token) => {
        const isTarget = Boolean(token.roleSlot);
        const pieceId = placements[token.id];
        const state: SlotValidation | undefined = validation[token.id];
        const locked = lockedTokenIds.includes(token.id);

        return (
          <Fragment key={token.id}>
            <div className="gc-col" data-target={isTarget || undefined}>
              <span className="gc-col-word" aria-hidden>
                {token.text}
              </span>

              {isTarget ? (
                <div
                  ref={(el) => registerSocket(token.id, el)}
                  className="gc-socket"
                  data-filled={pieceId ? "true" : undefined}
                  data-check={state && state !== "pending" ? state : undefined}
                  data-locked={locked || undefined}
                  data-armed={activeTargetTokenId === token.id || undefined}
                  data-fresh={freshTokenId === token.id || undefined}
                >
                  <span aria-hidden className="gc-socket-pin gc-socket-pin-a" />
                  <span aria-hidden className="gc-socket-pin gc-socket-pin-b" />
                  {pieceId ? (
                    <span className="gc-seated">{labelForPiece(pieceId)}</span>
                  ) : (
                    <span className="gc-socket-empty" aria-hidden />
                  )}

                  {/* ناحیهٔ لمسیِ اختصاصی: جدا از ظاهر، و تنها چیزی که در این
                      ستون رویداد می‌گیرد. */}
                  <button
                    type="button"
                    ref={(el) => registerHitTarget(token.id, el)}
                    className="gc-socket-hit"
                    disabled={!interactive || locked}
                    aria-label={
                      pieceId
                        ? `خانهٔ واژهٔ ${token.text} — ${labelForPiece(pieceId)}${
                            locked ? "، قفل‌شده" : "، برای برداشتن فعال کنید"
                          }`
                        : armed
                          ? `خانهٔ خالیِ واژهٔ ${token.text} — برای گذاشتن نقش فعال کنید`
                          : `خانهٔ خالیِ واژهٔ ${token.text}`
                    }
                    onClick={(event) => onSocketActivate(token.id, event.detail === 0)}
                  />
                </div>
              ) : (
                <span className="gc-col-gap" aria-hidden />
              )}
            </div>

            {/* جداکنندهٔ دقیقِ داده، بیرون از ستون تا عرضِ ستون را عوض نکند. */}
            {token.separatorAfter && (
              <span className="gc-sep" aria-hidden>
                {token.separatorAfter}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
