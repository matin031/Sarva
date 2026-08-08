export type NavLink = { href: string; label: string };

// Single source of truth for the header's "بیشتر" dropdown and the matching
// entries in the footer's quick-access list — add a link here once and both
// navs stay in sync instead of drifting apart.
export const MORE_NAV_LINKS: NavLink[] = [
  { href: "/exam", label: "امتحانات نهایی" },
  { href: "/sarvaclub", label: "سروا کلاب" },
  { href: "/vazn-yab", label: "وزن‌یاب" },
  { href: "/game", label: "بازی" },
  { href: "/about", label: "درباره" },
];

/** The footer, grouped by what a page is *for* rather than as one flat list.
 *
 *  A reader looking for the lesson notes and a reader looking for the meter
 *  finder are after different things; a single «دسترسی سریع» column of eight
 *  links made them read the whole list either way. Four short columns, each
 *  with a heading, are scanned instead of read. */
export const FOOTER_SECTIONS: { title: string; links: NavLink[] }[] = [
  {
    title: "یادگیری",
    links: [
      { href: "/doroos", label: "درسنامه" },
      { href: "/guide", label: "راهنمای یادگیری" },
      { href: "/quiz", label: "عروض سماعی" },
    ],
  },
  {
    title: "ابزارها",
    links: [
      { href: "/vazn-yab", label: "وزن‌یاب" },
      { href: "/exam", label: "امتحانات نهایی" },
      { href: "/game", label: "بازی" },
    ],
  },
  {
    title: "انجمن",
    links: [
      { href: "/sarvaclub", label: "سروا کلاب" },
      { href: "/panel", label: "پنل کاربری" },
    ],
  },
  {
    title: "سروا",
    links: [
      { href: "/", label: "صفحهٔ اصلی" },
      { href: "/about", label: "دربارهٔ ما" },
    ],
  },
];
