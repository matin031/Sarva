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

function Footer() {
  return (
    <footer
      dir="rtl"
      className="border-t bg-card/40 border-border mt-10 w-full "
    >
      <div
        className=" py-6 flex-col md:flex-row flex justify-between
       items-start container xl:px-12"
      >
        <div className=" flex-col items-center  justify-between min-[340px]:flex min-[340px]:flex-row mt-6 sm:mt-0  sm:block space-y-6">
          <div className=" ">
            <div className=" inline-flex  px-3 py-1 border-3 border-primary rounded-2xl items-center shrink-0 gap-x-2">
              <div className=" size-12  text-primary">
                <MainLogo />
              </div>
              <span className=" text-2xl font-bold text-primary">سروا</span>
            </div>
            <p className=" text-muted-foreground text-sm mt-4 cursor-default md:max-w-70 lg:max-w-100">
              پلتفرمی تعاملی برای یادگیری علم عروض و آشنایی با اوزان شعر فارسی،
              ادب کهن ایران‌زمین با الهام از هنر و ادب کهن ایران‌زمین.
            </p>
          </div>
        </div>
        <div className=" hidden md:block">
          <h3 className=" cursor-default">دسترسی سریع</h3>
          <ul
            className="text-muted-foreground text-sm
            space-y-2 *:hover:text-primary *:transition-all"
          >
            {QUICK_ACCESS_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className=" hidden md:block">
          <h3 className=" cursor-default">ارتباط</h3>
          <div
            className=" text-sm text-muted-foreground space-y-2
           *:hover:text-primary *:transition-all"
          >
            <Link
              className=" inline-flex items-center gap-x-2"
              href={"mailto:matinjafaridev@gmail.com"}
            >
              matinjafaridev@gmail.com
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </Link>
            <div className=" flex items-center gap-x-3">
              <Link
                href={"/"}
                className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className=" size-5"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
              </Link>
              <Link
                href={
                  "https://www.instagram.com/jafarimatin13?igsh=NjhsMjlqNWN3NDAw"
                }
                className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
              >
                <svg
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.9"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6m5-2h.01"></path>
                </svg>
              </Link>
              <Link
                href={"https://t.me/jafarimatin"}
                className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
              >
                <svg
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.9"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 3 2 11l6 2 2 6 4-4 5 4z"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
        <div className="min-[340px]:flex-row flex-col gap-y-6 flex md:hidden justify-between w-full mt-6 items-start">
          <div>
            <h3 className=" cursor-default">دسترسی سریع</h3>
            <ul
              className="text-muted-foreground text-sm
            space-y-2 *:hover:text-primary *:transition-all"
            >
              {QUICK_ACCESS_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className=" cursor-default">ارتباط</h3>
            <div
              className=" text-sm text-muted-foreground space-y-2
           *:hover:text-primary *:transition-all"
            >
              <Link
                className=" inline-flex items-center gap-x-2"
                href={"mailto:matinjafaridev@gmail.com"}
              >
                matinjafaridev@gmail.com
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </Link>
              <div className=" flex items-center gap-x-3">
                <Link
                  href={"/"}
                  className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className=" size-5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                  </svg>
                </Link>
                <Link
                  href={
                    "https://www.instagram.com/jafarimatin13?igsh=NjhsMjlqNWN3NDAw"
                  }
                  className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.9"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6m5-2h.01"></path>
                  </svg>
                </Link>
                <Link
                  href={"https://t.me/jafarimatin"}
                  className="w-9 h-9 rounded-full bg-secondary hover:bg-primary 
                  hover:text-primary-foreground transition-colors flex
                   items-center justify-center text-foreground"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.9"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 3 2 11l6 2 2 6 4-4 5 4z"></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="md:py-8 py-6 mt-10 text-xs xs:text-sm lg:text-base w-full flex flex-col 
      md:flex-row gap-y-3 items-center justify-between container border-t"
      >
        <p className="">
          © 2026 کلیه حقوق مادی و معنوی سایت برای
          <span className=" text-primary"> سروا </span> محفوظ است.
        </p>
        <div className=" items-center flex gap-x-1">
          <p>ساخته شده برای عاشقان ادبیات فارسی توسط متین</p>
          <div className=" text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className=" size-4 md:size-5"
            >
              <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
