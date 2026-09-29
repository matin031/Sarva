import type { ReactNode } from "react";

/**
 * منوی پنل مدیریت — یک منبع برای نوار کناری، کشوی موبایل و جست‌وجوی سریع.
 *
 * ⚠️ پیش از این فهرست داخلِ `AdminShell` بود؛ حالا جست‌وجوی سریع (Ctrl+K)
 * هم همین را لازم دارد، و دو فهرست یعنی روزی که بخشی به یکی اضافه شود و
 * در دیگری پیدا نشود.
 */

export type NavGroup = "" | "content" | "community" | "people" | "business" | "site" | "system";

export type NavItem = {
  href: string;
  label: string;
  group: NavGroup;
  /** واژه‌هایی که جست‌وجوی سریع با آن‌ها هم این بخش را پیدا کند. */
  keywords: string;
  icon: ReactNode;
};

/** ترتیب و عنوانِ دسته‌ها. `""` یعنی بدونِ عنوان (داشبورد). */
export const NAV_GROUPS: { id: NavGroup; title: string }[] = [
  { id: "", title: "" },
  { id: "content", title: "محتوای آموزشی" },
  { id: "community", title: "جامعه و بررسی" },
  { id: "people", title: "کاربران" },
  { id: "business", title: "درآمد و حامیان" },
  { id: "site", title: "سایت" },
  { id: "system", title: "سیستم" },
];

export const NAV: NavItem[] = [
  {
    href: "/admin",
    group: "",
    keywords: "خانه home dashboard آمار",
    label: "داشبورد",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V21h14V9.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 21v-6h5v6" />
      </svg>
    ),
  },
  {
    href: "/admin/exams",
    group: "content",
    keywords: "آزمون exam نهایی سؤال",
    label: "امتحانات نهایی",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 17.5a2.5 2.5 0 0 1 2.5-2.5H20" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7.5h8M8 10.5h5" />
      </svg>
    ),
  },
  {
    href: "/admin/quiz",
    group: "content",
    keywords: "عروض quiz صوت وزن",
    label: "عروض سماعی",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V6l11-2v12" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: "/admin/vocab",
    group: "content",
    keywords: "واژه لغت vocab",
    label: "واژه‌یاب",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 14 4.5-4a2 2 0 0 1 2.7 0L15 14" />
        <circle cx="15.5" cy="8.5" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/games",
    group: "content",
    keywords: "بازی جفت نینجا جاسوس رنگ‌آرا مدار games",
    label: "بازی‌ها",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <rect x="2.5" y="7" width="19" height="10" rx="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.5v3M5.5 12h3" />
        <circle cx="16" cy="11" r="1" />
        <circle cx="18" cy="13.5" r="1" />
      </svg>
    ),
  },
  {
    href: "/admin/club",
    group: "community",
    keywords: "کلاب سروده شعر دیدگاه club",
    label: "سروا کلاب",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h9a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5h-6L5 21v-3.5A2.5 2.5 0 0 1 4 15V5.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h6M8 11.5h4" />
      </svg>
    ),
  },
  {
    href: "/admin/plus",
    group: "business",
    keywords: "پلاس اشتراک خرید سفارش تیکت plus order",
    label: "سروا پلاس",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.4 5.1 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    group: "people",
    keywords: "کاربر user مسدود نقش",
    label: "کاربران",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <circle cx="9" cy="8" r="3.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19.5c.7-3.4 3-5.25 5.5-5.25s4.8 1.85 5.5 5.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 5.1a3.25 3.25 0 0 1 0 6.3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.7 14.3c2.1.5 3.6 2.2 4.1 5.2" />
      </svg>
    ),
  },
  {
    href: "/admin/teachers",
    group: "community",
    keywords: "دبیر معلم teacher",
    label: "درخواست دبیران",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 4 9 4.5-9 4.5-9-4.5L12 4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 10.8V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 9v5" />
      </svg>
    ),
  },
  {
    href: "/admin/activity",
    group: "system",
    keywords: "فعالیت خطا لاگ log error audit",
    label: "فعالیت و خطاها",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2.5-7 4 14 2.5-7H21" />
      </svg>
    ),
  },
  {
    href: "/admin/reports",
    group: "community",
    keywords: "گزارش report ایراد",
    label: "گزارش‌های محتوا",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V4.5m0 0c3.5-1.8 6.5 1.8 10 0v9c-3.5 1.8-6.5-1.8-10 0" />
      </svg>
    ),
  },
  {
    href: "/admin/announcements",
    group: "site",
    keywords: "اعلان announcement بنر",
    label: "اعلان سایت",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
    ),
  },
  {
    href: "/admin/supporters",
    group: "business",
    keywords: "حامی حمایت supporter",
    label: "حامیان",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" />
      </svg>
    ),
  },
  {
    href: "/admin/seo",
    group: "site",
    keywords: "سئو seo گوگل هوش مصنوعی",
    label: "سئو و هوش مصنوعی",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4.9-4.9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 12 2-2.5 1.8 1.6L14 8" />
      </svg>
    ),
  },
  {
    href: "/admin/sql",
    group: "system",
    keywords: "sql دیتابیس database کوئری",
    label: "کنسول SQL",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <ellipse cx="12" cy="6" rx="7.5" ry="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    group: "system",
    keywords: "تنظیمات settings ایمیل پیامک خبر",
    label: "تنظیمات",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
