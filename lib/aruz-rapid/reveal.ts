import type { RapidAruzUnit } from "./types";

/**
 * جای آشکارسازیِ متن پس از پاسخِ درست به واحدِ شمارهٔ index.
 *
 * اگر همهٔ واحدها revealProgress داشته باشند، همان مرجع است. اگر نه، به
 * نسبتِ سادهٔ (index+1)/تعداد برمی‌گردیم — و این صرفاً یک تقریبِ بصری است،
 * نه ادعای علمی دربارهٔ مرزِ هجاها.
 */
export function revealProgressAfterUnit(units: readonly RapidAruzUnit[], index: number): number {
  if (units.length === 0) return 0;
  const i = Math.min(Math.max(index, 0), units.length - 1);

  const allHaveReveal = units.every(
    (u) => typeof u.revealProgress === "number" && Number.isFinite(u.revealProgress),
  );

  if (allHaveReveal) {
    const value = units[i].revealProgress as number;
    return Math.min(Math.max(value, 0), 1);
  }

  return (i + 1) / units.length;
}

/** آیا آشکارسازی از خودِ داده می‌آید یا تقریبِ بصری است؟ (برای گزارش و تست) */
export function revealSource(units: readonly RapidAruzUnit[]): "data" | "fallback" {
  return units.length > 0 &&
    units.every((u) => typeof u.revealProgress === "number" && Number.isFinite(u.revealProgress))
    ? "data"
    : "fallback";
}
