"use client";

/** An infinite marquee of عروضی feet (ارکان) — a subtle "ticker" band that adds
 *  motion and reinforces the subject. Duplicated once so the loop is seamless. */
const ARKAN = [
  "فعولن",
  "مفاعیلن",
  "فاعلاتن",
  "مستفعلن",
  "مفعولُ",
  "فاعلن",
  "مفاعلن",
  "فعلاتن",
  "متفاعلن",
  "مفتعلن",
];

export default function AruzMarquee() {
  const row = [...ARKAN, ...ARKAN];
  return (
    <div
      dir="rtl"
      aria-hidden
      className="group relative flex w-full overflow-hidden border-y border-border/60 bg-card/30 py-4 select-none [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div
        className="flex shrink-0 items-center gap-8 pe-8"
        style={{ animation: "aruzMarquee 28s linear infinite" }}
      >
        {row.map((r, i) => (
          <span key={i} className="flex items-center gap-8 whitespace-nowrap">
            <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-2xl font-black tracking-wide text-transparent sm:text-3xl">
              {r}
            </span>
            <span className="text-primary/50">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
