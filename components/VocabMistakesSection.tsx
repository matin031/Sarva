export type VocabMistake = {
  key: string;
  word: string;
  meaning: string;
  image: string;
  gradeLabel: string;
  lessonLabel: string;
  wrongCount: number;
  lastMissed: string; // formatted Jalali date
};

export default function VocabMistakesSection({ mistakes }: { mistakes: VocabMistake[] }) {
  if (mistakes.length === 0) {
    return (
      <div className="glass relative z-20 rounded-xl p-6 text-center text-sm text-muted-foreground">
        هنوز در بازیِ واژه‌یاب کلمه‌ای را اشتباه نزده‌ای — عالیه! 🎉
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {mistakes.map((m) => (
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
            <p className="mt-1 text-xs text-muted-foreground/80">
              {m.gradeLabel} · {m.lessonLabel} · {m.lastMissed}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
