export type VocabMistake = {
  key: string;
  word: string;
  meaning: string;
  image: string;
  wrongCount: number;
  lastMissed: string; // formatted Jalali date
};

export type VocabMistakeGroup = {
  key: string; // `${grade}:${lesson}`
  gradeLabel: string;
  lessonLabel: string;
  mistakes: VocabMistake[];
};

export default function VocabMistakesSection({ groups }: { groups: VocabMistakeGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="glass relative z-20 rounded-xl p-6 text-center text-sm text-muted-foreground">
        هنوز در بازیِ واژه‌یاب کلمه‌ای را اشتباه نزده‌ای — عالیه! 🎉
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.key}>
          {/* lesson header */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {g.gradeLabel} · {g.lessonLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              {g.mistakes.length.toLocaleString("fa-IR")} واژه
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* words missed in this lesson */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.mistakes.map((m) => (
              <div
                key={m.key}
                className="glass relative z-20 flex items-center gap-3 rounded-xl p-3 text-right"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-2xl">🖼️</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-lg font-black text-primary">{m.word}</h4>
                    <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                      {m.wrongCount.toLocaleString("fa-IR")} بار اشتباه
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{m.meaning}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">آخرین اشتباه: {m.lastMissed}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
