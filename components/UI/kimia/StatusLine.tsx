"use client";

import { KIMIA_COPY } from "@/lib/kimia/copy";
import type { KimiaVerdict } from "@/lib/kimia/types";

export type StatusKind =
  | "idle"
  | "loading"
  | "mixing"
  | "analyzing"
  | "correct"
  | "wrong"
  | "wrongIdle"
  | "error"
  | "cue";

/**
 * خطِ وضعیت — سمتِ راستِ نوارِ اقدام.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا کارتِ زیرِ رَک حذف شد
 * ═══════════════════════════════════════════════════════════════════════
 * نتیجه تا حالا یک *کارتِ جدا* زیرِ رَک بود: سطحی دیگر با لبه و پس‌زمینهٔ
 * خودش، داخلِ صحنه‌ای که خودش از سطح‌ها ساخته شده — یعنی کارت داخلِ کارت،
 * و یک ردیفِ کاملِ ارتفاع که فقط گاهی حرف داشت. حالا همان یک جمله در
 * نوارِ اقدام می‌نشیند، کنارِ دکمه‌ای که به آن مربوط است.
 *
 * ⚠️ ارتفاعِ نوار ثابت است، پس آمدن و رفتنِ متن هیچ چیزی را جابه‌جا
 * نمی‌کند (CLS صفر می‌ماند).
 *
 * ⚠️ `aria-live` روی *ظرفِ ثابت* است و نه روی متنی که عوض می‌شود: اگر
 * گره‌ای که `aria-live` دارد خودش جایگزین شود، بعضی صفحه‌خوان‌ها تغییر
 * را اصلاً اعلام نمی‌کنند.
 *
 * ⚠️ و `key` روی محتوا عمدی است: با عوض شدنِ متن، گره تازه می‌شود و
 * انیمیشنِ ورود (محوشدن + ۴ پیکسل حرکت) دوباره اجرا می‌شود. بدونش، متنِ
 * دوم بی‌صدا جای اولی می‌نشست.
 */
export default function StatusLine({
  kind,
  verdict,
  message,
  remaining,
}: {
  kind: StatusKind;
  verdict: KimiaVerdict | null;
  /** خطای شبکه یا راهنماییِ کوتاهِ رابط. */
  message: string | null;
  remaining: number;
}) {
  const tone =
    kind === "correct" ? "ok" : kind === "wrong" || kind === "error" ? "bad" : undefined;

  const text =
    kind === "error"
      ? (message ?? "")
      : kind === "correct"
        ? KIMIA_COPY.correct(verdict?.meterName)
        : kind === "wrong"
          ? /* راهنماییِ سرور دقیق‌تر از متنِ عمومی است — اگر آمد، همان. */
            (verdict?.hint ?? KIMIA_COPY.wrong)
          : kind === "wrongIdle"
            ? KIMIA_COPY.wrongIdle
            : kind === "loading"
              ? KIMIA_COPY.loading
              : kind === "mixing"
                ? KIMIA_COPY.mixing
                : kind === "analyzing"
                  ? KIMIA_COPY.analyzing
                  : kind === "cue"
                    ? (message ?? "")
                    : remaining > 0
                      ? KIMIA_COPY.remaining(toFa(remaining))
                      : KIMIA_COPY.ready;

  return (
    <p className="km-status" data-kind={kind} data-tone={tone} aria-live="polite">
      <span key={`${kind}:${text}`} className="km-status-body">
        <StatusIcon kind={kind} />
        <span className="km-status-text">{text}</span>
      </span>
    </p>
  );
}

/** آیکنِ کوچکِ کنارِ جمله — فقط سه شکل، چون فقط سه حالت معنا دارند. */
function StatusIcon({ kind }: { kind: StatusKind }) {
  if (kind === "correct") {
    return (
      <svg className="km-status-icon" viewBox="0 0 16 16" aria-hidden focusable="false">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "wrong" || kind === "error" || kind === "wrongIdle") {
    return (
      <svg className="km-status-icon" viewBox="0 0 16 16" aria-hidden focusable="false">
        <path
          d="M8 3.5v5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="8" cy="12.2" r="1.05" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "mixing" || kind === "analyzing" || kind === "loading") {
    return (
      <svg className="km-status-icon km-status-icon-spin" viewBox="0 0 16 16" aria-hidden focusable="false">
        <circle
          cx="8"
          cy="8"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="20 14"
        />
      </svg>
    );
  }
  /* ⚠️ جای آیکن حتی وقتی آیکنی نیست رزرو می‌ماند: وگرنه با هر پیام،
     متن چند پیکسل جابه‌جا می‌شد (CLS). */
  return <span className="km-status-icon" aria-hidden />;
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
