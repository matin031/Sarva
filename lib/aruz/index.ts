// نقطهٔ ورودِ عمومیِ موتورِ عروض — برای استفادهٔ اکشن‌های سرور
import { detect, type Confidence } from "./detect";
import { normalize } from "./engine";

export interface MeterGuess {
  rhythm: string; // "ارکان (نام)" — همان شکلِ خروجیِ گنجور
  ark: string;
  name: string;
  pattern: string;
  confidence: Confidence;
}

/** تشخیصِ وزنِ یک یا دو مصراع با موتورِ محلی (بدونِ نیاز به اینترنت/گنجور). */
export function findMeterLocally(
  mesra1: string,
  mesra2?: string,
): MeterGuess | undefined {
  if (!normalize(mesra1)) return undefined;
  const { rows, conf } = detect(mesra1, mesra2);
  const best = rows[0];
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
