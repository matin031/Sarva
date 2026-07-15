"use client";

type MatchingPairsWithDistractorContent = {
  type: "matching-pairs-with-distractor";
  promptText?: string;
  columnA: { id: string; text: string }[];
  columnB: { id: string; text: string }[];
};

type Props = {
  content: MatchingPairsWithDistractorContent;
  value: Record<string, string>;
  onChange: (columnAId: string, columnBId: string) => void;
  disabled?: boolean;
};

/** Desktop version of this type is usually line-connecting between two
 *  columns; per the mobile-first requirement, that becomes a dropdown per
 *  column-A row here — line-connecting has poor touch-drag accuracy on
 *  small screens. columnB has more options than columnA on purpose (at
 *  least one distractor), which the dropdown naturally supports. */
export default function MatchingPairsWithDistractorPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.promptText && <p className="text-base leading-relaxed xs:text-lg">{content.promptText}</p>}
      <div className="flex flex-col gap-2.5">
        {content.columnA.map((row) => (
          <div key={row.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5">
            <span className="text-sm font-semibold text-primary">{row.id})</span>
            <span className="text-base leading-relaxed">{row.text}</span>
            <select
              dir="rtl"
              disabled={disabled}
              value={value[row.id] ?? ""}
              onChange={(e) => onChange(row.id, e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-muted px-2 text-sm text-foreground outline-none
                focus:border-primary disabled:opacity-60"
            >
              <option value="" disabled>
                انتخاب مفهوم مناسب
              </option>
              {content.columnB.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.id}) {opt.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
