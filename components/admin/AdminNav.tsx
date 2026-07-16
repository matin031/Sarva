import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "خانه" },
  { href: "/admin/exams", label: "امتحانات نهایی" },
  { href: "/admin/quiz", label: "عروض سماعی" },
  { href: "/admin/users", label: "کاربران" },
];

export default function AdminNav() {
  return (
    <div dir="rtl" className="mx-auto flex max-w-2xl flex-wrap gap-2 px-4 pt-6 xs:px-5">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
