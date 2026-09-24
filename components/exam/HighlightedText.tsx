import MarkedText from "@/components/exam/MarkedText";
import { stripCombiningUnderline } from "@/lib/exam/underline";

/** The same text with its `{{…}}` and U+0332 markup removed — for places
 *  that can only hold a string, like a native `<option>`. */
export function plainText(text: string): string {
  return stripCombiningUnderline(text.replace(/\{\{([^}]+)\}\}/g, "$1"));
}

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
  if (parts.length === 1) return <MarkedText text={text} />;
  // one wrapper, same reason as MarkedText: inside RichPassageView's flex row
  // every sibling element would get its own gap
  return (
    <span>
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
    </span>
  );
}
