"use client";

import { useEffect } from "react";
import type { ScansionLength } from "@/lib/aruz-rapid/types";

/**
 * میان‌برهای صفحه‌کلید.
 *
 * از event.code استفاده می‌شود و نه event.key: با چیدمانِ فارسی، key چیزِ
 * دیگری می‌دهد ولی کلیدِ فیزیکی همان است. یعنی همان دو کلید، در هر چیدمان.
 */
const SHORT_CODES = new Set(["KeyU"]);
const LONG_CODES = new Set(["Minus", "NumpadSubtract"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useRapidAruzKeyboard({
  enabled,
  onAnswer,
}: {
  enabled: boolean;
  onAnswer: (length: ScansionLength) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // نگه‌داشتنِ کلید نباید رگبارِ پاسخ بسازد.
      if (event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      let length: ScansionLength | null = null;
      if (SHORT_CODES.has(event.code)) length = "short";
      else if (LONG_CODES.has(event.code)) length = "long";
      if (!length) return;

      event.preventDefault();
      onAnswer(length);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onAnswer]);
}
