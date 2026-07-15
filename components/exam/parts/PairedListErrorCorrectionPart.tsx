"use client";

type PairedListErrorCorrectionContent = {
  type: "paired-list-error-correction";
  items: { id: string; pairText: string }[];
};

export type PairedListJudgment = { isCorrect: boolean; correctedText?: string };
export type PairedListErrorCorrectionValue = Record<string, PairedListJudgment>;

type Props = {
  content: PairedListErrorCorrectionContent;
  value: PairedListErrorCorrectionValue;
  onChange: (value: PairedListErrorCorrectionValue) => void;
  disabled?: boolean;
};

/** Every item needs a درست/غلط judgment (unlike find-n-errors-in-list,
 *  where only some items get flagged) — there are no options to pick from,
 *  the list itself has to be checked and corrected inline. */
export default function PairedListErrorCorrectionPart({ content, value, onChange, disabled }: Props) {
  const setJudgment = (id: string, isCorrect: boolean) => {
    onChange({ ...value, [id]: { isCorrect, correctedText: isCorrect ? undefined : value[id]?.correctedText } });
  };

  return (
    <div dir="rtl" className="flex flex-col gap-2 text-right">
      {content.items.map((item) => {
        const judgment = value[item.id];
        return (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base">{item.pairText}</span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setJudgment(item.id, true)}
                  className={`min-h-11 rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    judgment?.isCorrect === true
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  درست
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setJudgment(item.id, false)}
                  className={`min-h-11 rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    judgment?.isCorrect === false
                      ? "border-destructive bg-destructive/15 text-destructive"
                      : "border-border bg-muted text-muted-foreground hover:border-destructive/50"
                  }`}
                >
                  غلط
                </button>
              </div>
            </div>
            {judgment?.isCorrect === false && (
              <input
                dir="rtl"
                type="text"
                disabled={disabled}
                value={judgment.correctedText ?? ""}
                onChange={(e) => onChange({ ...value, [item.id]: { isCorrect: false, correctedText: e.target.value } })}
                placeholder="نام درست را بنویسید..."
                className="min-h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-base outline-none
                  placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
