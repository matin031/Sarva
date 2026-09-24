"use client";

import { splitWords, type LicenseMark } from "@/lib/aruz-rapid/license";

const PUNCT = /[،؛:.!?؟«»"()]/g;

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c.5 4.6 2.4 6.9 7 7.5-4.6.6-6.5 2.9-7 7.5-.5-4.6-2.4-6.9-7-7.5 4.6-.6 6.5-2.9 7-7.5Z" />
      <path d="M19 15.5c.2 1.8.9 2.6 2.5 2.8-1.6.2-2.3 1-2.5 2.7-.2-1.7-.9-2.5-2.5-2.7 1.6-.2 2.3-1 2.5-2.8Z" opacity=".7" />
    </svg>
  );
}

/**
 * یادداشتِ اختیارِ شاعری زیرِ مصراع: کدام هجا، در کدام کلمه، چگونه خوانده
 * می‌شود. بی‌این، دانش‌آموز «کِه»ی بلند را کوتاه می‌زند و فکر می‌کند قاعده
 * را بلد نیست.
 *
 * `veiled`: وقتی مصراع پوشیده است، فهرست هم مات می‌شود — نامِ کلمه‌ها بخشی
 * از متن را لو می‌دهد. نشان می‌ماند تا بداند اختیار در راه است.
 */
export default function LicenseNote({
  text,
  marks,
  veiled,
  live,
}: {
  text: string;
  marks: LicenseMark[];
  veiled: boolean;
  /** زمانِ مطالعه: ورودِ پرجلوه‌تر. */
  live: boolean;
}) {
  if (marks.length === 0) return null;
  const words = splitWords(text);
  return (
    <div className="aruzr-lic" data-veiled={veiled ? "true" : "false"} data-live={live ? "true" : "false"}>
      <span className="aruzr-lic-badge">
        <Sparkle className="aruzr-lic-spark" />
        اختیار شاعری
      </span>
      <ul className="aruzr-lic-list" aria-hidden={veiled ? "true" : undefined}>
        {marks.map((m, i) => (
          <li key={m.unit} className="aruzr-lic-item" style={{ "--i": i } as React.CSSProperties}>
            <span className="aruzr-lic-ref">{(words[m.word * 2] ?? "").replace(PUNCT, "")}</span>
            <span className="aruzr-lic-unit">«{m.display}»</span>
            <span className="aruzr-lic-len" data-length={m.length}>
              {m.length === "long" ? "بلند" : "کوتاه"}
            </span>
            {m.license === "meter" ? (
              <span className="aruzr-lic-kind" title="اختیار وزنی">
                وزنی
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
