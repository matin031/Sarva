"use client";

import MainLogo from "@/components/svgs/mainLogo";

/* پردهٔ بارگذاری.
 *
 * ⚠️ چرا نوارِ پیشرفتِ واقعی ندارد: تنها راهِ گرفتنِ درصدِ واقعی،
 * `useProgress` است که به `THREE.DefaultLoadingManager` وصل می‌شود — یعنی
 * three را به بستهٔ *اصلی* می‌آورد و کلِ زحمتِ جداکردنِ chunkـِ WebGL را
 * بی‌اثر می‌کند. برای چند ثانیه انتظار، این معامله نمی‌ارزید.
 *
 * ⚠️ پرده با `visible=false` هم در DOM می‌ماند و فقط محو می‌شود. اگر
 * برداشته می‌شد، ارتفاعِ ظرف یک لحظه می‌پرید — همان «پرشِ چیدمان» که
 * نباید پیش بیاید. */
export function LoadingVeil({ visible }: { visible: boolean }) {
  return (
    <div className="ps-veil" data-visible={visible ? "" : undefined} aria-hidden={!visible}>
      <div className="ps-veil__inner">
        <div className="ps-veil__logo">
          <MainLogo />
        </div>
        <p className="ps-veil__text" role="status" aria-live="polite">
          {visible ? "قفسه در حالِ چیده‌شدن است…" : ""}
        </p>
        <div className="ps-veil__bar">
          <span />
        </div>
      </div>
    </div>
  );
}
