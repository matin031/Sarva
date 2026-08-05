import { poemLines } from "@/lib/club/types";

/** A سروده, set the way a poem wants to be set: one line per line, centred,
 *  in the site's Naskh serif — the same face درسنامه uses for a بیت.
 *
 *  A blank line in the source is a stanza break and gets air rather than an
 *  empty row, so a چهارپاره reads as four-line blocks instead of one long
 *  column. `clamp` is the feed's version: the first few lines, with the rest
 *  waiting behind the card. */
export default function PoemBody({
  body,
  clamp,
  className = "",
}: {
  body: string;
  /** show at most this many lines and mark the poem as continuing */
  clamp?: number;
  className?: string;
}) {
  const raw = body.replace(/\r\n?/g, "\n").split("\n");
  const lines = clamp ? poemLines(body).slice(0, clamp) : raw;
  const truncated = clamp ? poemLines(body).length > clamp : false;

  return (
    <div
      dir="rtl"
      className={`font-serif text-[15px] leading-[2.2] sm:text-base ${className}`}
    >
      {lines.map((line, i) =>
        line.trim() ? (
          <p key={i} className="text-center text-foreground">
            {line}
          </p>
        ) : (
          <div key={i} className="h-4" aria-hidden />
        ),
      )}
      {truncated && (
        <p className="mt-1 text-center text-sm text-muted-foreground">…</p>
      )}
    </div>
  );
}
