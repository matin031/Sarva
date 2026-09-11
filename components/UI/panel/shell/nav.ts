import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Compass,
  Gamepad2,
  GraduationCap,
  House,
  LifeBuoy,
  Music4,
  ScanSearch,
  Settings,
  Sparkles,
} from "lucide-react";

/**
 * ناوبریِ پنل، یک‌جا.
 *
 * ⚠️ این فایل هیچ JSX ندارد و `"use client"` هم ندارد، تا هم سایدبارِ
 * دسکتاپ و هم کشوی موبایل و هم نوارِ بالا (برای پیدا کردنِ عنوانِ صفحهٔ
 * فعلی) از یک منبع بخوانند. پیش از این، ده آیکنِ SVG داخلِ خودِ کامپوننتِ
 * ناوبری نوشته شده بودند — سیصد خط JSX که فقط یک فهرست بود.
 */

export type PanelNavItem = {
  /** بخشِ بعد از `/panel/` — کلید و مسیر، هر دو. */
  src: string;
  title: string;
  icon: LucideIcon;
  /** نشانِ کنارِ عنوان، مثل «پلاس». */
  tag?: string;
  /**
   * مقصدِ کامل، وقتی صفحه زیرِ `/panel/` نیست.
   *
   * ⚠️ بدونِ این، هر آیتم اجبارا به `/panel/${src}` می‌رفت — و «سروا پلاس»
   * یک صفحهٔ عمومی در ریشهٔ سایت است (`/plus`)، نه یک صفحهٔ درونِ پنل. آیتمی
   * که `href` دارد در حالتِ design-preview هم بازنویسی نمی‌شود، چون بیرونِ
   * پنل است و پیش‌نمایشی ندارد.
   */
  href?: string;
};

export type PanelNavGroup = {
  id: "review" | "practice" | "account";
  label: string;
  items: PanelNavItem[];
};

export const PANEL_NAV: PanelNavGroup[] = [
  {
    id: "review",
    label: "مرور",
    items: [
      { src: "home", title: "خانه", icon: House },
      { src: "analysis", title: "برنامهٔ من", icon: Compass, tag: "پلاس" },
    ],
  },
  {
    id: "practice",
    label: "تمرین",
    items: [
      { src: "aruz", title: "عروض سماعی", icon: Music4 },
      { src: "vocab", title: "واژه‌یاب", icon: ScanSearch },
      { src: "jasoos", title: "جاسوس", icon: Gamepad2 },
      { src: "exam", title: "آزمون نهایی", icon: GraduationCap },
      // ⚠️ جای «سروا کلاب» را گرفت. خودِ کلاب حذف نشده — از هدرِ سایت و از
      // صفحهٔ خانهٔ پنل در دسترس است — ولی این جایگاه در فهرست به صفحهٔ
      // معرفیِ سروا پلاس داده شد.
      { src: "plus", title: "سروا پلاس", icon: Sparkles, href: "/plus", tag: "پلاس" },
    ],
  },
  {
    id: "account",
    label: "حساب",
    items: [
      { src: "bookmarks", title: "نشان‌شده‌ها", icon: BookMarked },
      { src: "subscription", title: "اشتراک", icon: Sparkles },
      { src: "support", title: "پشتیبانی", icon: LifeBuoy },
      { src: "setting", title: "تنظیمات حساب", icon: Settings },
    ],
  },
];

/** گروهی که این مسیر در آن است — همان گروهی که باید باز باشد. */
export function groupOf(pathname: string): PanelNavGroup["id"] {
  const src = pathname.replace(/^\/panel\/?/, "").split("/")[0];
  const group = PANEL_NAV.find((g) => g.items.some((i) => i.src === src));
  return group?.id ?? "review";
}

/** عنوانِ صفحهٔ فعلی برای نوارِ بالا. */
export function titleOf(pathname: string): string {
  if (process.env.NODE_ENV === "development" && pathname === "/design-preview") return "خانه";
  if (process.env.NODE_ENV === "development") pathname = pathname.replace(/^\/design-preview\//, "/panel/");
  if (pathname.startsWith("/panel/billing")) return "خریدهای من";
  // ⚠️ «سروا کلاب» از فهرست بیرون رفت ولی صفحه‌اش سرِ جایش است؛ بدونِ این
  // خط، نوارِ بالای /panel/club به «پنل کاربری» می‌افتاد.
  if (pathname.startsWith("/panel/club")) return "سروا کلاب";
  const src = pathname.replace(/^\/panel\/?/, "").split("/")[0];
  for (const group of PANEL_NAV) {
    const hit = group.items.find((i) => i.src === src);
    if (hit) return hit.title;
  }
  // زیرصفحه‌هایی که در فهرست نیستند (مثل یک تیکتِ پشتیبانی) نامِ پنل را
  // نگه می‌دارند تا نوار خالی نماند.
  return "پنل کاربری";
}
