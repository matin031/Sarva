"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   پیدا کردنِ قطعه‌های صحنه در DOM — تنها جایی که این نام‌ها را می‌شناسد.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ **چرا از DOM و نه از ref.**

   هر جای این بازی که یک کامپوننت، *هندسهٔ* کامپوننتِ دیگری را لازم داشت،
   با `useImperativeHandle` می‌گرفتش. آن الگو یک بار خاموش شکست و تشخیصش
   نصفِ یک جلسه وقت برد:

   در حالتِ توسعه، React هر کامپوننت را دوبار سوار می‌کند. آن‌وقت
   `ref.current` می‌تواند روی handleِ نمونه‌ای بماند که دیگر چیزی رندر
   نمی‌کند — نمونه‌ای زنده به‌نظر ولی با نقشه‌های خالی. نتیجه‌اش این بود
   که مبدأِ پروازِ شیشه‌ها همیشه `null` می‌شد و پرواز بی‌صدا به یک
   fadeِ ساده تنزل می‌کرد. هیچ خطایی، هیچ هشداری. (با گذاشتنِ شناسه روی
   نمونه‌ها ثابت شد: refها روی یک نمونه می‌نشستند و handle روی نمونهٔ
   دیگر.)

   «کجاست؟» سؤالی است که خودِ صفحه همیشه درست جواب می‌دهد. پس هر
   اندازه‌گیری از اینجا می‌گذرد، و هیچ کامپوننتی برای *هندسه* به
   کامپوننتِ دیگر ref نمی‌دهد.

   ⚠️ همهٔ جست‌وجوها **از یک ریشه (`scope`)** انجام می‌شوند و نه از
   `document`: صفحهٔ شروع و صفحهٔ بازی هر دو یک «ظرفِ بیت» دارند، و اگر
   روزی هم‌زمان روی صفحه بودند، سراسری بودنِ جست‌وجو یکی را با دیگری
   اشتباه می‌گرفت.
   ═══════════════════════════════════════════════════════════════════════════ */

export type VesselParts = {
  /** خودِ باکسِ بیت — مبنای هندسهٔ ریختن. */
  readonly root: HTMLElement | null;
  /** میزبانِ لایه‌های رنگ. */
  readonly bands: HTMLElement | null;
  /** موجِ سطحِ مایع. */
  readonly wave: HTMLElement | null;
};

export type OverlayParts = {
  readonly stream: SVGPathElement | null;
  readonly ripple: SVGEllipseElement | null;
  readonly drops: readonly SVGCircleElement[];
};

const pick = <T extends Element>(scope: ParentNode | null, selector: string): T | null =>
  scope ? scope.querySelector<T>(selector) : null;

export function vesselParts(scope: ParentNode | null): VesselParts {
  return {
    root: pick<HTMLElement>(scope, ".km-verse-card"),
    bands: pick<HTMLElement>(scope, ".km-verse-bands"),
    wave: pick<HTMLElement>(scope, ".km-verse-wave"),
  };
}

export function overlayParts(scope: ParentNode | null): OverlayParts {
  return {
    stream: pick<SVGPathElement>(scope, ".km-pour-stream"),
    ripple: pick<SVGEllipseElement>(scope, ".km-pour-ripple"),
    drops: scope ? [...scope.querySelectorAll<SVGCircleElement>(".km-pour-drop")] : [],
  };
}

/** شیشهٔ نشستهٔ جایگاهِ `index`ام. */
export function placedTube(scope: ParentNode | null, index: number): HTMLElement | null {
  return pick<HTMLElement>(scope, `[data-slot="${index}"] .km-tube`);
}

/** بدنهٔ شیشهٔ نشسته — مبنای اندازه‌گیریِ هندسهٔ مایع. */
export function placedTubeBody(scope: ParentNode | null, index: number): HTMLElement | null {
  return pick<HTMLElement>(scope, `[data-slot="${index}"] .km-tube-body`);
}
