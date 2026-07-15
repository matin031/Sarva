"use client";

type FindNErrorsInListContent = {
  type: "find-n-errors-in-list";
  items: { id: string; text: string }[];
  errorCount: number;
};

export type FindNErrorsValue = {
  errorItemIds: string[];
  corrections: Record<string, string>;
};

type Props = {
  content: FindNErrorsInListContent;
  value: FindNErrorsValue;
  onChange: (value: FindNErrorsValue) => void;
  disabled?: boolean;
};

export default function FindNErrorsInListPart({ content, value, onChange, disabled }: Props) {
  const toggle = (id: string) => {
    const isFlagged = value.errorItemIds.includes(id);
    if (isFlagged) {
      const rest = { ...value.corrections };
      delete rest[id];
      onChange({ errorItemIds: value.errorItemIds.filter((i) => i !== id), corrections: rest });
    } else {
      onChange({ errorItemIds: [...value.errorItemIds, id], corrections: value.corrections });
    }
  };

  return (
    <div dir="rtl" className="flex flex-col gap-2 text-right">
      <p className="text-xs text-muted-foreground">
        {content.errorCount} نادرستی وجود دارد — موارد غلط را علامت بزنید و شکل درست را بنویسید.
        <span className="mr-1 font-medium text-primary">
          ({value.errorItemIds.length} از {content.errorCount})
        </span>
      </p>
      <div className="flex flex-col gap-2">
        {content.items.map((item) => {
          const flagged = value.errorItemIds.includes(item.id);
          return (
            <div
              key={item.id}
              className={`flex flex-col gap-2 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                flagged ? "border-destructive/60 bg-destructive/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base">{item.text}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(item.id)}
                  className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors
                    disabled:opacity-60 ${
                      flagged
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-border bg-muted text-muted-foreground hover:border-destructive/50"
                    }`}
                >
                  {flagged ? "غلط است" : "غلط است؟"}
                </button>
              </div>
              {flagged && (
                <input
                  dir="rtl"
                  type="text"
                  disabled={disabled}
                  value={value.corrections[item.id] ?? ""}
                  onChange={(e) => onChange({ ...value, corrections: { ...value.corrections, [item.id]: e.target.value } })}
                  placeholder="شکل درست را بنویسید..."
                  className="min-h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-base outline-none
                    placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
