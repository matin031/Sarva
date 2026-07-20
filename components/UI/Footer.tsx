import Link from "next/link";
import MainLogo from "../svgs/mainLogo";
import { MORE_NAV_LINKS } from "@/lib/site-nav";

const QUICK_ACCESS_LINKS = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/guide", label: "راهنمای یادگیری" },
  { href: "/quiz", label: "عروض سماعی" },
  { href: "/panel", label: "پنل کاربری" },
  ...MORE_NAV_LINKS,
];

const SOCIALS = [
  {
    href: "https://t.me/jafarimatin",
    label: "تلگرام",
    path: "M22 3 2 11l6 2 2 6 4-4 5 4z",
  },
  {
    href: "https://www.instagram.com/jafarimatin13?igsh=NjhsMjlqNWN3NDAw",
    label: "اینستاگرام",
    path: "M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6m5-2h.01",
  },
];

function Footer() {
  return (
    <footer dir="rtl" className="mt-16 w-full border-t border-border bg-card/40">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* brand */}
        <div className="lg:col-span-2">
          <div className="inline-flex items-center gap-x-2">
            <div className="size-11 text-primary">
              <MainLogo />
            </div>
            <span className="text-2xl font-bold text-primary">سروا</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            پلتفرمی تعاملی برای یادگیری علم عروض و آشنایی با اوزان شعر فارسی و ادب کهن ایران‌زمین.
          </p>
          <div className="mt-4 flex items-center gap-x-3">
            {SOCIALS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <svg
                  className="size-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.9"
                  viewBox="0 0 24 24"
                >
                  <path d={s.path} />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* quick links */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">دسترسی سریع</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground *:transition-all *:hover:text-primary sm:grid-cols-1">
            {QUICK_ACCESS_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* contact */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">ارتباط</h3>
          <Link
            href="mailto:matinjafaridev@gmail.com"
            className="inline-flex items-center gap-x-2 text-sm text-muted-foreground transition-all hover:text-primary"
            dir="ltr"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            matinjafaridev@gmail.com
          </Link>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-y-2 py-4 text-xs text-muted-foreground sm:flex-row sm:text-sm">
          <p>
            © ۲۰۲۶ کلیهٔ حقوق برای <span className="text-primary">سروا</span> محفوظ است.
          </p>
          <p className="flex items-center gap-x-1">
            ساخته‌شده برای عاشقان ادبیات فارسی توسط متین
            <span className="text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001Z" />
              </svg>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
