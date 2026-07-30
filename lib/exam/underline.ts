const LOW_LINE = "̲"; // COMBINING LOW LINE
const ZWNJ = "‌";

export type TextRun = { text: string; underlined: boolean };

/**
 * Exam content marks emphasised words with U+0332 (COMBINING LOW LINE) glued to
 * every letter — `گ̲ر̲ز̲ه̲` — because that is how the text
 * survives being pasted out of the original Word/PDF papers. Left alone the font
 * draws one stub per letter, straight through the descenders of ج، ی، ر، ز and
 * under the کسره, which is the broken line users kept reporting. No stylesheet
 * can fix it: the marks are characters, not decoration.
 *
 * This strips them and reports which stretches were marked, so the caller can
 * render those stretches with `.fa-underline` and get one continuous rule sitting
 * clear of the letters.
 *
 * Combining marks that carry meaning — shadda, kasra, damma, fatha — are left
 * exactly where they are; only U+0332 is removed.
 */
export function splitUnderlined(input: string): TextRun[] {
  if (!input.includes(LOW_LINE)) return input ? [{ text: input, underlined: false }] : [];

  // 1. group each base character with the combining marks that follow it, so a
  //    letter carrying both a shadda and a low line stays one unit
  type Cluster = { text: string; underlined: boolean };
  const clusters: Cluster[] = [];
  for (const ch of input) {
    const combining = /\p{M}/u.test(ch);
    if (combining && clusters.length > 0) {
      const last = clusters[clusters.length - 1];
      if (ch === LOW_LINE) last.underlined = true;
      else last.text += ch;
      continue;
    }
    clusters.push({ text: ch, underlined: false });
  }

  // 2. a space or ZWNJ sitting between two marked clusters belongs to the run —
  //    the separators inside a marked phrase are never marked themselves, and
  //    without this the rule would break into one segment per word
  for (let i = 1; i < clusters.length - 1; i++) {
    if (clusters[i].underlined) continue;
    if (!/^[\s‌]+$/.test(clusters[i].text)) continue;
    let before = i - 1;
    while (before >= 0 && /^[\s‌]+$/.test(clusters[before].text)) before--;
    let after = i + 1;
    while (after < clusters.length && /^[\s‌]+$/.test(clusters[after].text)) after++;
    if (clusters[before]?.underlined && clusters[after]?.underlined) clusters[i].underlined = true;
  }

  // 3. merge neighbours that agree
  const runs: TextRun[] = [];
  for (const c of clusters) {
    const last = runs[runs.length - 1];
    if (last && last.underlined === c.underlined) last.text += c.text;
    else runs.push({ text: c.text, underlined: c.underlined });
  }
  return runs;
}

/** True when the text carries any U+0332 marks. */
export function hasCombiningUnderline(input: string): boolean {
  return input.includes(LOW_LINE);
}

/** The text with every U+0332 removed and nothing else changed. */
export function stripCombiningUnderline(input: string): string {
  return input.split(LOW_LINE).join("");
}

export { LOW_LINE, ZWNJ };
