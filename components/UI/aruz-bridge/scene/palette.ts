"use client";

import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useTokenRgb } from "@/lib/theme/use-primary-rgb";
import { sceneColor } from "./sceneColor";

/* ═══════════════════════════════════════════════════════════════════════════
   پالتِ صحنه — یک جا، از توکن‌های سایت و تمِ روشن/تیره.
   ═══════════════════════════════════════════════════════════════════════════

   پیش از این هر جزءِ صحنه خودش `useTokenRgb` صدا می‌زد و رنگش را جدا
   می‌ساخت؛ و هیچ‌کدام نمی‌دانست سایت روشن است یا تیره. نتیجه این بود که روی
   تمِ روشن هم یک «شبِ» تیره وسطِ کاغذِ کرم می‌نشست.

   حالا همهٔ رنگ‌ها یک بار اینجا ساخته می‌شوند و به همه پاس داده می‌شوند:

     • تیره  → آسمانِ شب با ستاره و شفقِ همان پالت، شیشهٔ روشن روی تهیِ تیره.
     • روشن → آسمانِ سپیده‌دم با مهِ کرمی، شیشهٔ پررنگ‌تر تا روی زمینهٔ روشن
               گم نشود، و متنِ تیره روی شیشه.

   همهٔ `THREE.Color`ها در فضای *خطی*‌اند (خروجیِ `sceneColor`)، چون شیدرها
   در پایان `colorspace_fragment` را صدا می‌زنند. */

export interface ScenePalette {
  dark: boolean;
  /** «r,g,b» خامِ --primary، برای جاهایی که به بومِ 2D نیاز دارند. */
  primaryRgb: string;
  primary: THREE.Color;
  gold: THREE.Color;
  success: THREE.Color;
  danger: THREE.Color;
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  abyss: THREE.Color;
  fog: THREE.Color;
  /** تنِ شیشه: رنگی که در عمقِ شیشه دیده می‌شود. */
  glassDeep: THREE.Color;
  glassTint: THREE.Color;
  /** لبهٔ درخشانِ شیشه. */
  glassRim: THREE.Color;
  /** متنِ روی شیشه و هالهٔ پشتش. */
  ink: THREE.Color;
  inkGlow: THREE.Color;
  /** فلزِ سازهٔ پل. */
  metal: THREE.Color;
  /** شدتِ کلیِ درخشش‌های افزایشی؛ روی زمینهٔ روشن باید کمتر باشد. */
  glowGain: number;
}

function subscribeClass(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

/** آیا سایت همین حالا تیره است. همان کلاسی که `@variant dark` هم می‌خواند. */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribeClass,
    () => document.documentElement.classList.contains("dark"),
    () => true,
  );
}

const rgb = (s: string) => {
  const [r, g, b] = s.split(",").map(Number);
  return new THREE.Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
};

export function useScenePalette(): ScenePalette {
  const dark = useIsDark();
  const primaryRgb = useTokenRgb("--primary");
  const goldRgb = useTokenRgb("--gold", "217,164,65");
  const bgRgb = useTokenRgb("--background", dark ? "18,24,40" : "247,243,234");
  const fgRgb = useTokenRgb("--foreground", dark ? "241,238,231" : "30,38,60");
  const dangerRgb = useTokenRgb("--destructive", "220,70,60");

  return useMemo<ScenePalette>(() => {
    const primary = sceneColor(primaryRgb);
    const gold = sceneColor(goldRgb);
    const bg = rgb(bgRgb);
    const fg = rgb(fgRgb);
    // «درست» سبزِ ثابت نیست: کمی به سمتِ پالت می‌رود تا در پالتِ رز هم غریبه نباشد.
    const success = new THREE.Color("#3ddc97").convertSRGBToLinear().lerp(primary, 0.2);
    const danger = rgb(dangerRgb).lerp(new THREE.Color(1, 0.25, 0.2), 0.35);

    if (dark) {
      return {
        dark,
        primaryRgb,
        primary,
        gold,
        success,
        danger,
        skyTop: bg.clone().multiplyScalar(0.55).lerp(sceneColor(primaryRgb, 0.08, 0.3), 0.5),
        skyHorizon: sceneColor(primaryRgb, 0.32, 0.15),
        abyss: sceneColor(primaryRgb, 0.05, 0.25),
        fog: sceneColor(primaryRgb, 0.12, 0.3),
        glassDeep: sceneColor(primaryRgb, 0.12, 0.2),
        glassTint: sceneColor(primaryRgb, 1.25, 0.05),
        glassRim: sceneColor(primaryRgb, 1.55, 0),
        ink: sceneColor(fgRgb, 1.1),
        inkGlow: sceneColor(primaryRgb, 1.1),
        metal: sceneColor(primaryRgb, 0.55, 0.72),
        glowGain: 1,
      };
    }

    // ── روشن: سپیده‌دم ─────────────────────────────────────────────────────
    const cream = bg.clone();
    return {
      dark,
      primaryRgb,
      primary,
      gold,
      success: success.clone().multiplyScalar(0.8),
      danger,
      skyTop: sceneColor(primaryRgb, 1.62, 0.25),
      skyHorizon: cream.clone().lerp(gold, 0.18),
      abyss: sceneColor(primaryRgb, 1.25, 0.45),
      fog: cream.clone().lerp(sceneColor(primaryRgb, 1.55, 0.3), 0.35),
      glassDeep: sceneColor(primaryRgb, 0.45, 0.1),
      glassTint: sceneColor(primaryRgb, 0.9, 0),
      glassRim: sceneColor(primaryRgb, 1.35, 0),
      ink: fg.clone(),
      inkGlow: new THREE.Color(1, 1, 1),
      metal: sceneColor(primaryRgb, 1.1, 0.75),
      glowGain: 0.6,
    };
  }, [dark, primaryRgb, goldRgb, bgRgb, fgRgb, dangerRgb]);
}
