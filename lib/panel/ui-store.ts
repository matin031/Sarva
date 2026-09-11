"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PanelNavGroup } from "@/components/UI/panel/shell/nav";

/**
 * حالتِ *رابط* پنل — و فقط رابط.
 *
 * ⚠️ هیچ دادهٔ کاربری اینجا نمی‌آید. دقت، زنجیره، کارنامه‌ها و نشان‌ها همه
 * روی سرور خوانده می‌شوند و به‌صورت prop پایین می‌آیند؛ کپی‌کردنشان در یک
 * استورِ کلاینت یعنی دو منبعِ حقیقت که از هم می‌افتند.
 *
 * آنچه اینجاست، دو چیزِ کوچک است که کاربر با کلیک عوضشان می‌کند و انتظار
 * دارد دفعهٔ بعد یادشان باشد: گروهِ بازِ سایدبار، و باز یا بستهٔ کشوی
 * موبایل (که ذخیره نمی‌شود — کشو باید همیشه بسته باز شود).
 */

type PanelUiState = {
  /** گروهی که کاربر دستی باز کرده. `null` یعنی «هرچه صفحهٔ فعلی می‌گوید». */
  openGroup: PanelNavGroup["id"] | null;
  setOpenGroup: (id: PanelNavGroup["id"] | null) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
};

export const usePanelUi = create<PanelUiState>()(
  persist(
    (set) => ({
      openGroup: null,
      setOpenGroup: (openGroup) => set({ openGroup }),
      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: "sarva-panel-ui",
      // ⚠️ فقط گروهِ باز ذخیره می‌شود. اگر `mobileNavOpen` هم ذخیره می‌شد،
      // کاربری که با کشوی باز صفحه را ترک کرده، دفعهٔ بعد پنل را پشتِ یک
      // کشوی باز پیدا می‌کرد.
      partialize: (state) => ({ openGroup: state.openGroup }),
    },
  ),
);
