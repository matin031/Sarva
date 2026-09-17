import React from "react";
import { SARVA_LOGO_PATHS, SARVA_LOGO_VIEWBOX } from "./sarvaLogoPaths";

/* شکلِ نشان در `sarvaLogoPaths.ts` است و نه اینجا.
 *
 * ⚠️ چرا جدا شد: همین شش مسیر حالا سه مصرف‌کننده دارند — این کامپوننت،
 * `public/favicon.svg`، و حکاکیِ نشان روی دیوارِ بازیِ «قفسهٔ شاعران» که
 * به خودِ دادهٔ مسیر نیاز دارد. خروجیِ این کامپوننت مو به مو همان چیزی است
 * که پیش‌تر بود: همان ترتیب، همان کلاس‌ها، همان دو هگزِ پشتیبان. */

function MainLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={SARVA_LOGO_VIEWBOX}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
    >
      <g>
        {SARVA_LOGO_PATHS.map((path, index) => (
          <path
            key={index}
            className={`logo-ink-${path.ink}`}
            /* هگزِ پشتیبان برای جایی که CSS هنوز نرسیده (مثلاً رندرِ خامِ SVG). */
            fill={path.ink === 1 ? "#0DBFC3" : "#00ABB5"}
            d={path.d}
          />
        ))}
      </g>
    </svg>
  );
}

export default MainLogo;
