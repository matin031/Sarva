import { detect, type Confidence } from "./detect";
import { normalize } from "./engine";

export interface MeterGuess {
  rhythm: string;
  ark: string;
  name: string;
  pattern: string;
  confidence: Confidence;
}

export function findMeterLocally(
  mesra1: string,
  mesra2?: string,
): MeterGuess | undefined {
  if (!normalize(mesra1) || (mesra2 !== undefined && !normalize(mesra2))) return undefined;
  const { rows, conf, s1, s2 } = detect(mesra1, mesra2);
  const best = rows[0];
  // Ranking the sentinel cost (999) is not metrical evidence.
  if (!s1.size || (s2 !== null && !s2.size) || !best || best.c1 >= 999 || best.c2 >= 999) return undefined;
  return {
    rhythm: `${best.ark} (${best.name})`,
    ark: best.ark,
    name: best.name,
    pattern: best.pat,
    confidence: conf,
  };
}

export { detect, marks, altArkan, bestScan } from "./detect";
export { normalize, tokenizeLine, tokenizeWord, scanLine } from "./engine";
