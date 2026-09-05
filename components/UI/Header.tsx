"use client";
import { motion } from "motion/react";
import MainLogo from "../svgs/mainLogo";
import Link from "next/link";
import DarkModeButton from "./DarkModeButton";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";

import { useRouter } from "next/navigation";

/**
 * @param compact پوستهٔ جمع‌شده برای صفحه‌هایی که تمامِ ارتفاع را لازم دارند
 *   (مثلاً بازیِ در جریان). هویتِ سروا، تمِ روشن/تیره و ورود سرِ جایشان
 *   می‌مانند؛ فقط ناوبریِ ثانویه و فاصله‌های بزرگ جمع می‌شوند.
 *   پیش‌فرض خاموش است، پس هیچ صفحهٔ موجودی تغییر نمی‌کند.
 */
function Header({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  // پیش‌تر این کامپوننت خودش supabase.auth.getUser() می‌زد و به
  // onAuthStateChange گوش می‌داد. حالا هوک مشترک این کار را می‌کند و نتیجه را
  // بین کامپوننت‌ها کش می‌کند، تا پنج کامپوننت روی یک صفحه پنج بار /me را صدا
  // نزنند. جای onAuthStateChange را refreshCurrentUser/clearCurrentUser
  // گرفته‌اند که فرم‌های ورود و خروج صدایشان می‌زنند.
  const { user } = useCurrentUser();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [openMenuMobile, setOpenMenuMobile] = useState(false);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);


  const nameRef = useRef<HTMLSpanElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    if (nameRef.current) {
      const overflow =
        nameRef.current.scrollWidth >
        nameRef.current.parentElement!.clientWidth;
      setIsOverflow(overflow);
    }
  }, [user]);

  const menuItemsMobile = [
    {
      id: 1,
      title: "آزمون‌ها",
      src: "/exam",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      ),
    },
    {
      id: 2,
      title: "درسنامه",
      src: "/doroos",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
      ),
    },
    {
      id: 3,
      title: "بازی‌ها",
      src: "/game",
      icon: (
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M6 12h4M8 10v4"></path>
          <circle cx="16" cy="11" r="0.5" fill="currentColor"></circle>
          <circle cx="18" cy="13" r="0.5" fill="currentColor"></circle>
          <rect width="20" height="10" x="2" y="7" rx="5"></rect>
        </svg>
      ),
    },
    {
      id: 4,
      title: "عروض",
      src: "/aruz",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12h3l2.25-7.5 4.5 15 2.25-9 1.5 4.5h4.5"
          />
        </svg>
      ),
    },
    {
      id: 6,
      title: "کلاب",
      src: "/sarvaclub",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h9a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5h-6L5 21v-3.5A2.5 2.5 0 0 1 4 15V5.5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 8h6M8 11.5h4"
          />
        </svg>
      ),
    },
    {
      id: 5,
      title: "وزن‌یاب",
      src: "/vazn-yab",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
          />
        </svg>
      ),
    },
  ];

  const menUItemsPc = [
    // { id: 3, title: "بازی", src: "/game" },
    // { id: 4, title: "عروض", src: "/aruz" },
    { id: 6, title: "راهنما", src: "/guide" },
  ];

  return (
    <nav
      /* حالتِ جمع‌شده را پلِ وزن روشن می‌کند (lib/immersive-mode.ts). دو سازوکار
         کنارِ همند و با هم تداخل ندارند: یکی سربرگ را کاملاً برمی‌دارد، دیگری
         فقط فشرده‌اش می‌کند. */
      /* ⚠️ `flex-row-reverse` برداشته شد.
         
         این کلاس وقتی گذاشته شده بود که سندْ `ltr` بود و سربرگ باید
         *دستی* آینه می‌شد تا راست‌به‌چپ دیده شود. حالا که ریشه `rtl` است،
         همان کلاس دوباره آینه‌اش می‌کرد و لوگو به چپ می‌رفت — در
         اسکرین‌شاتِ پیش/پس دقیقاً همین دیده شد.

         بدونِ این کلاس، ترتیبِ DOM (لوگو اول) در جریانِ RTL خودش لوگو را
         سمتِ راست می‌نشاند. ترتیبِ دیداری، ترتیبِ DOM و ترتیبِ فوکوس هر سه
         یکی می‌شوند. */
      className={`flex justify-between items-center container ${
        compact ? "mt-1.5" : "mt-4"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className={compact ? "rounded-2xl" : " sm:px-3 sm:py-1 rounded-2xl"}
      >
        <Link
          className="hover:brightness-90 gap-x-2 items-center size-full flex"
          href={"/"}
        >
          <h3
            className={`hidden sm:block font-bold text-primary ${
              compact ? "text-xl" : "text-3xl"
            }`}
          >
            ســـروا
          </h3>
          <div
            className="bg-linear-to-br transition-all flex
           items-center justify-center "
          >
            <div
              id="site-logo"
              className={`text-primary-foreground ${compact ? "size-9" : "size-13"}`}
            >
              <MainLogo />
            </div>
          </div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className={`font-semibold flex items-center ${compact ? "gap-x-2" : "gap-x-4"}`}
      >
        <DarkModeButton />
        {user ? (
          <>
            <Link
              href={"/panel/home"}
              className="active:scale-95 px-4 py-1 rounded-lg text-sm transition-all
               glass hover:bg-accent/70! overflow-hidden max-w-24 hidden sm:flex"
            >
              <span
                ref={nameRef}
                className={
                  isOverflow
                    ? "animate-marquee whitespace-nowrap"
                    : "whitespace-nowrap"
                }
              >
                {user?.fullName ?? "پنل کاربری"}
              </span>
            </Link>
            <Link
              href={"/panel"}
              className="active:scale-95 p-2 rounded-lg text-sm transition-all
               glass hover:bg-accent/70! overflow-hidden  flex sm:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </Link>
          </>
        ) : (
          <>
            <Link
              href={"/auth"}
              className="active:scale-95 px-4 py-1 rounded-lg
               text-sm transition-all glass hover:bg-accent/70!"
            >
              ورود
            </Link>
          </>
        )}
        {!compact && "|"}
        <div
          className={`text-muted-foreground items-center gap-x-5 text-lg flex-row ${
            compact ? "hidden" : "flex"
          }`}
        >
          <div className=" block z-200 relative">
            <button
              /* همان دلیلِ بالا: آینهٔ دستی، حالا که ریشه rtl است، زیادی است. */
              className="text-muted-foreground text-sm xs:text-base flex items-center gap-x-2"
              onClick={() => {
                setOpenMenuMobile((prev) => !prev);
              }}
            >
              فهرست
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`size-4 transition-all ${!openMenuMobile && " rotate-180"}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            <div
              className={`${openMenuMobile ? " translate-y-2 visible opacity-100" : " -translate-y-7 invisible opacity-0"} 
             transition-transform duration-150 ease-in-out absolute bg-menu-mobile 
             border-border border py-5 px-4 rounded-lg gap-x-6 flex 
              items-center end-0 justify-between gap-y-6 w-50 sm:w-62.5 flex-wrap`}
            >
              {menuItemsMobile.map((l) => (
                <Link
                  key={l.id}
                  onClick={() => {
                    setOpenMenuMobile(false);
                  }}
                  className=" text-xs text-muted-foreground hover:text-primary transition-all  sm:text-base flex items-center flex-col"
                  href={l.src}
                >
                  {l.icon}
                  {l.title}
                </Link>
              ))}
            </div>
          </div>
          {menUItemsPc.map((l) => (
            <Link
              key={l.id}
              className=" hover:text-primary transition-all"
              href={l.src}
            >
              {l.title}
            </Link>
          ))}
        </div>
      </motion.div>
      <div
        onClick={() => {
          setOpenMenuMobile(false);
        }}
        className={`${openMenuMobile ? " block" : " hidden"} fixed h-screen
         w-screen bottom-0 right-0 z-100 backdrop-blur-xs`}
      ></div>
    </nav>
  );
}

export default Header;
