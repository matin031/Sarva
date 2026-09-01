"use client";

import { useCallback, useSyncExternalStore } from "react";

/** رنگ‌های صحنهٔ سه‌بعدی.
 *
 *  WebGL از CSS custom property چیزی نمی‌فهمد، پس رنگ‌ها باید به‌صورتِ عدد
 *  به three داده شوند. پالت اینجا زندگی می‌کند ولی *هم‌خانوادهٔ* همان
 *  متغیرهای شیوه‌نامه است؛ تمِ فعال از کلاسِ روی `<html>` خوانده می‌شود —
 *  همان منبعی که CSS هم به آن نگاه می‌کند. */

export interface SceneTheme {
  dark: boolean;
  /** پسِ تخته — جسمی که نور روی آن می‌افتد. */
  slab: string;
  slabEdge: string;
  /** سیم در حالتِ خنثی. */
  trace: string;
  /** سوکت بر حسبِ نتیجهٔ تشخیص. */
  open: string;
  seated: string;
  ok: string;
  bad: string;
  scan: string;
  /** جریان و لامپ. */
  energy: string;
  lamp: string;
  ambient: string;
  /** بدنه و غلافِ سلولِ باتری. */
  cell: string;
  cellBand: string;
  /** کفِ گودِ سوکت. در تمِ روشن نباید سیاه باشد. */
  wellFloor: string;
}

/* تمِ روشن قبلاً همه‌چیزش کم‌رنگ بود و قطعه‌ها در پس‌زمینه گم می‌شدند.
   حالا اجزاء *تیره* روی سطحِ روشن می‌نشینند — همان کاری که یک بردِ واقعی
   روی میزِ سفید می‌کند — و کنتراست از خودِ اجسام می‌آید نه از رنگِ زمینه. */
const LIGHT: SceneTheme = {
  dark: false,
  slab: "#dfe7e6",
  slabEdge: "#5d6b70",
  trace: "#5c7a78",
  open: "#94a8a6",
  seated: "#2f6f68",
  ok: "#0f8f68",
  bad: "#c9503a",
  scan: "#cf8f24",
  energy: "#0e9384",
  lamp: "#ffb52e",
  ambient: "#ffffff",
  cell: "#7d878c",
  cellBand: "#123a3f",
  wellFloor: "#b7c5c4",
};

const DARK: SceneTheme = {
  dark: true,
  slab: "#101e28",
  slabEdge: "#1b3040",
  trace: "#2f5a5e",
  open: "#24414c",
  seated: "#3d7a76",
  ok: "#35c39a",
  bad: "#e2745c",
  scan: "#e8b055",
  energy: "#4fd6c4",
  lamp: "#ffc857",
  ambient: "#9fd4ff",
  cell: "#8d979c",
  cellBand: "#0f3b44",
  wellFloor: "#05090c",
};

/** با `useSyncExternalStore` خوانده می‌شود، نه با state در افکت: تم یک
 *  حالتِ *بیرونی* است و همان قاعده‌ای را دارد که `usePrefersReducedMotion`.
 *  گذاشتنِ setState در افکت اینجا هم رندرِ زنجیره‌ای می‌سازد و هم قاعدهٔ
 *  lint پروژه را می‌شکند. */
export function useSceneTheme(): SceneTheme {
  const subscribe = useCallback((onChange: () => void) => {
    const root = document.documentElement;
    const observer = new MutationObserver(onChange);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    // روی سرور تمِ تیره فرض می‌شود؛ لایهٔ سه‌بعدی فقط روی کلاینت ساخته
    // می‌شود، پس این مقدار هیچ‌وقت واقعاً رندر نمی‌شود.
    () => true,
  );

  return dark ? DARK : LIGHT;
}
