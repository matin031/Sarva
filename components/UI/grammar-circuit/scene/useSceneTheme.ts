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
}

const LIGHT: SceneTheme = {
  dark: false,
  slab: "#eef4f3",
  slabEdge: "#d3e0dd",
  trace: "#9fb8b4",
  open: "#c3d3d0",
  seated: "#7fa6a0",
  ok: "#2f9e79",
  bad: "#d4674f",
  scan: "#e0a33f",
  energy: "#1f9d8f",
  lamp: "#f2c14e",
  ambient: "#ffffff",
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
  lamp: "#ffd479",
  ambient: "#9fd4ff",
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
