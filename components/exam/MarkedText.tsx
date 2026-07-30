import { splitUnderlined } from "@/lib/exam/underline";

/**
 * Renders exam text that marks its emphasised words with U+0332 combining low
 * lines (see lib/exam/underline.ts) as real underlined spans. Text without those
 * marks renders unchanged, so this is safe to wrap around any exam string.
 */
export default function MarkedText({ text }: { text: string }) {
  const runs = splitUnderlined(text);
  /* One wrapper span, always. RichPassageView lays its tokens out in a flex row
     with `gap-x-1`, so every element child is a flex item that gets 4px of space
     around it — returning the runs as siblings pushed a gap in front of the
     comma in «همه جهان، آتش». Kept inside one item they flow as ordinary inline
     text and the punctuation stays put. */
  return (
    <span>
      {runs.map((run, i) =>
        run.underlined ? (
          <span key={i} className="fa-underline">
            {run.text}
          </span>
        ) : (
          run.text
        ),
      )}
    </span>
  );
}
