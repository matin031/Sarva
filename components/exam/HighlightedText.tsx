import MarkedText from "@/components/exam/MarkedText";

/**
 * MCQ option text is a plain string (not a RichPassage), but some
 * questions need to underline one word/phrase inside an option (e.g. "کدام
 * گزینه واژهٔ زیر را نادرست نوشته؟" where the target word sits inside each
 * option). Rather than char-offset ranges — fragile to author by hand,
 * easy to get off-by-one on Persian text — options mark the target inline
 * with `{{...}}`, e.g. "کان کمند {{شست}} خویش بگشاید". This renders that
 * markup as a decorative underline; plain text with no `{{}}` renders
 * unchanged.
 */
export default function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = /^\{\{([^}]+)\}\}$/.exec(part);
        // no `{{}}` here, but the text may still mark its words with U+0332
        if (!match) return <MarkedText key={i} text={part} />;
        return (
          <span key={i} className="fa-underline">
            {match[1]}
          </span>
        );
      })}
    </>
  );
}
