/** Static, frozen preview of the وزن‌یاب tool for the homepage — the same
 *  card the real page uses, pre-filled with one example verse and its result
 *  already shown, as if a search just finished. Intentionally NOT animated
 *  (no loop/typewriter) to keep the homepage calm; only a gentle CSS
 *  hover-scale as a static micro-interaction. Mirrors the visuals of
 *  components/UI/guide/VaznYabSection.tsx but carries no logic. */

const EXAMPLE = {
  mesra1: "شهر یاران بود و خاک مهربانان این دیار",
  mesra2: "مهربانی کی سرآمد؟ شهریاران را چه شد؟",
  feet: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
  bahr: "رملِ مثمنِ محذوف",
};

export default function VaznYabDemo() {
  return (
    <div
      aria-hidden
      dir="rtl"
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 transition-transform duration-300 ease-out hover:scale-[1.02]"
    >
      {/* the input card — pre-filled */}
      <div className="glass relative z-20 rounded-3xl p-5 sm:p-7">
        <span className="text-xs text-muted-foreground sm:text-sm">
          بیت خود را بنویس — هر مصراع در یک خط
        </span>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-5">
          <span className="w-18.75 shrink-0 rounded-xl border border-border bg-secondary px-2 py-1 text-center text-xs">
            مصراع اول
          </span>
          <div className="w-full rounded-3xl border-2 border-border bg-secondary px-4 py-2 text-right text-sm text-foreground sm:text-base">
            {EXAMPLE.mesra1}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-5">
          <span className="w-18.75 shrink-0 rounded-xl border border-border bg-secondary px-2 py-1 text-center text-xs">
            مصراع دوم
          </span>
          <div className="w-full rounded-3xl border-2 border-border bg-secondary px-4 py-2 text-right text-sm text-foreground sm:text-base">
            {EXAMPLE.mesra2}
          </div>
        </div>

        <span className="mt-7 inline-flex items-center gap-x-2 rounded-3xl bg-primary px-4 py-1.5 font-bold text-secondary brightness-90 sm:text-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          پیدا کن
        </span>
      </div>

      {/* the result card — already showing the detected meter */}
      <div className="glass relative z-20 rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-x-3 text-lg font-bold sm:text-xl">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="size-5"
              viewBox="0 0 24 24"
            >
              <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
            </svg>
          </span>
          <h3>وزن و بحر</h3>
        </div>

        <div className="mt-6">
          <span className="mb-2 inline-block text-xs text-muted-foreground sm:text-sm">
            ارکان عروضی
          </span>
          <div className="w-full rounded-3xl bg-primary/10 px-2 py-3 text-center font-bold text-primary">
            {EXAMPLE.feet}
          </div>
        </div>

        <div className="mt-3">
          <span className="text-xs text-muted-foreground sm:text-sm">بحر</span>
          <div className="w-full font-bold brightness-75">{EXAMPLE.bahr}</div>
        </div>
      </div>
    </div>
  );
}
