"use client";
import { motion } from "motion/react";
import MainLogo from "../svgs/mainLogo";
import Link from "next/link";
import DarkModeButton from "./DarkModeButton";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

import { useRouter } from "next/navigation";

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
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

  const menuItems = [
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
      id: 5,
      title: "درباره",
      src: "/about",
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
            d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="mt-4 flex justify-between items-center flex-row-reverse container">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className=" sm:px-3 sm:py-1 rounded-2xl"
      >
        <Link
          className="hover:brightness-90 gap-x-2 items-center size-full flex"
          href={"/"}
        >
          <h3 className=" hidden sm:block text-3xl font-bold text-primary">
            ســـروا
          </h3>
          <div
            className="bg-linear-to-br transition-all flex
           items-center justify-center "
          >
            <div id="site-logo" className=" size-13 text-primary-foreground">
              <MainLogo />
            </div>
          </div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className=" font-semibold flex items-center gap-x-4"
      >
        <DarkModeButton />
        {user ? (
          <>
            <Link
              href={"/panel"}
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
                {user?.user_metadata?.full_name ?? "پنل کاربری"}
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
        |
        <div className=" text-muted-foreground hidden gap-x-5 md:flex text-lg">
          <Link className=" hover:text-primary transition-all" href={"/guide"}>
            راهنما
          </Link>
          <Link
            className=" sm:block hidden hover:text-primary transition-all"
            href={"/about"}
          >
            درباره
          </Link>
          <Link
            className=" sm:block hidden hover:text-primary transition-all"
            href={"/aruz"}
          >
            عروض
          </Link>
          <Link
            className=" sm:block hidden hover:text-primary transition-all"
            href={"/aruz"}
          >
            بازی
          </Link>
          <Link
            className=" sm:block hidden hover:text-primary transition-all"
            href={"/aruz"}
          >
            درسنامه
          </Link>
          <Link
            className=" sm:block hidden hover:text-primary transition-all"
            href={"/aruz"}
          >
            آزمون نهایی
          </Link>
        </div>
        <div className=" block md:hidden z-200 relative">
          <button
            className="text-muted-foreground text-sm xs:text-base flex items-center gap-x-2 flex-row-reverse"
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
             transition-transform duration-150 ease-in-out absolute bg-menu-mobile border-border border py-5 px-4 rounded-lg gap-x-6 flex 
              items-center -left-30 max-h-22`}
          >
            {menuItems.map((l) => (
              <Link
                key={l.id}
                onClick={() => {
                  setOpenMenuMobile(false);
                }}
                className=" text-xs text-muted-foreground hover:gap-y-0.5 transition-all  sm:text-base flex items-center flex-col"
                href={l.src}
              >
                {l.icon}
                {l.title}
              </Link>
            ))}
          </div>
        </div>
        <Link
          className=" md:hidden  text-muted-foreground text-sm xs:text-base"
          href={"/guide"}
        >
          راهنما
        </Link>
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
