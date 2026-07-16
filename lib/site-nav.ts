export type NavLink = { href: string; label: string };

// Single source of truth for the header's "بیشتر" dropdown and the matching
// entries in the footer's quick-access list — add a link here once and both
// navs stay in sync instead of drifting apart.
export const MORE_NAV_LINKS: NavLink[] = [
  { href: "/exam", label: "امتحانات نهایی" },
  { href: "/vazn-yab", label: "وزن‌یاب" },
  { href: "/game", label: "بازی" },
  { href: "/about", label: "درباره" },
];
