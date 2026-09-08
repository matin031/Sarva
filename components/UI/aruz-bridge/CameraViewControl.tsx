"use client";

import type { CameraView } from "@/lib/aruz-bridge/types";

export function CameraViewControl({ value, onChange }: { value: CameraView; onChange: (view: CameraView) => void }) {
  return (
    <div role="group" aria-label="نمای دوربین" className="pointer-events-auto inline-flex rounded-xl border border-[#36515c] bg-[#0b1e29]/95 p-1 text-xs text-[#dcece9] shadow-lg" dir="rtl">
      {([['first', 'اول‌شخص'], ['third', 'سوم‌شخص']] as const).map(([view, label]) => (
        <button key={view} type="button" aria-pressed={value === view} onClick={() => onChange(view)}
          className={`min-h-9 min-w-20 rounded-lg px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#81e6d5] ${value === view ? 'bg-[#70d9c7] font-bold text-[#092e32]' : 'hover:bg-[#24434d]'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
