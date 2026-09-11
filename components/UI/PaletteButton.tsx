"use client";

import { useSyncExternalStore } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, Palette } from "lucide-react";
import {
  applyPalette,
  DEFAULT_PALETTE,
  PALETTES,
  readPalette,
  subscribeToPalette,
  type PaletteId,
} from "@/lib/theme/palette";
import styles from "./palette-button.module.css";

/**
 * انتخابِ پالتِ رنگی — همسایهٔ کلیدِ روشن/تاریک.
 *
 * پالت و تم دو محورِ مستقل‌اند: پالت روی `data-palette` و تم روی کلاسِ
 * `dark` می‌نشیند، هر ترکیبی از آن دو معتبر است و انتخابِ هر کدام دیگری را
 * دست نمی‌زند.
 *
 * ⚠️ برخلافِ `DarkModeButton` این کامپوننت پیش از mount `null` برنمی‌گرداند.
 * آن‌جا لازم بود چون خودِ آیکون به تم وابسته است؛ اینجا آیکون همیشه یکی است
 * و برگرداندنِ null فقط باعث می‌شد ردیفِ هدر بعد از هیدریشن یک تکان بخورد.
 * تنها چیزی که به کلاینت نیاز دارد، *کدام* پالت تیک بخورد است.
 */
export default function PaletteButton() {
  /* ⚠️ عمداً `useState` + `useEffect` نیست.
     منبعِ حقیقتِ پالت، اتریبیوتِ روی <html> است — همان چیزی که اسکریپتِ
     درون‌خطیِ layout پیش از اولین رنگ‌آمیزی می‌نویسد. نگه داشتنِ یک کپیِ
     ری‌اکتی از آن یعنی دو منبعِ حقیقت که می‌توانند از هم جدا بیفتند (مثلاً
     اگر جای دیگری `applyPalette` صدا زده شود). `useSyncExternalStore` همان
     اتریبیوت را می‌خواند و با MutationObserver به تغییرش گوش می‌دهد، پس
     انتخابِ کاربر فقط DOM را عوض می‌کند و تیک خودش دنبالش می‌آید.

     آرگومانِ سوم، مقدارِ رندرِ سرور است: سرور DOM ندارد و باید همان
     پیش‌فرضی را بدهد که در HTML نوشته شده. */
  const current = useSyncExternalStore(
    subscribeToPalette,
    readPalette,
    () => DEFAULT_PALETTE,
  );

  return (
    <Menu.Root dir="rtl" modal={false}>
      <Menu.Trigger className={styles.trigger} aria-label="انتخاب پالت رنگی">
        <Palette size={20} strokeWidth={1.7} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className={styles.menu}
          align="end"
          sideOffset={10}
          collisionPadding={12}
          loop
        >
          <Menu.Label className={styles.title}>پالت رنگی</Menu.Label>
          <Menu.RadioGroup
            value={current}
            onValueChange={(value) => applyPalette(value as PaletteId)}
            className={styles.grid}
          >
            {PALETTES.map(({ id, label }) => (
              <Menu.RadioItem key={id} value={id} className={styles.item}>
                <span
                  className={`pal-swatch ${styles.swatch}`}
                  data-pal={id}
                  aria-hidden
                >
                  {current === id && (
                    <Check size={15} strokeWidth={3.2} className={styles.check} />
                  )}
                </span>
                <span className={styles.label}>{label}</span>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
