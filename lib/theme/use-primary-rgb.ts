"use client";

import { useSyncExternalStore } from "react";

/**
 * رنگِ `--primary` به‌صورتِ «r,g,b» برای بوم‌های canvas.
 *
 * canvas متغیرِ CSS نمی‌فهمد، پس بومی که رنگِ ثابت بنویسد با عوض شدنِ پالت یا
 * تم عوض نمی‌شود. این هوک رنگ را از خودِ <html> می‌خواند (با یک بومِ ۱×۱ که هر
 * نحوی مثلِ oklch یا lab را به rgb حل می‌کند) و با تغییرِ `class` یا
 * `data-palette` دوباره می‌خواند.
 */
const FALLBACK = "31,209,164";
const cache = new Map<string, string>();

function read(token: string): string {
  const root = document.documentElement;
  const key = `${token}|${root.className}|${root.dataset.palette ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const css = getComputedStyle(root).getPropertyValue(token).trim();
  if (!ctx || !css) return FALLBACK;
  ctx.fillStyle = `rgb(${FALLBACK})`;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const value = `${r},${g},${b}`;
  cache.set(key, value);
  return value;
}

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-palette"] });
  return () => mo.disconnect();
}

/** هر توکنِ رنگیِ دیگر، مثلِ `--gold`. */
export function useTokenRgb(token: `--${string}`, fallback = FALLBACK): string {
  return useSyncExternalStore(subscribe, () => read(token), () => fallback);
}

export function usePrimaryRgb(): string {
  return useTokenRgb("--primary");
}
