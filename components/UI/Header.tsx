"use client";
import { motion } from "motion/react";
import MainLogo from "../svgs/mainLogo";
import Link from "next/link";
import DarkModeButton from "./DarkModeButton";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { MORE_NAV_LINKS } from "@/lib/site-nav";

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

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
        <Link
          className="active:scale-95 hover:brightness-90 xs:block hidden 
              transition-all text-sm bg-primary text-white py-1 px-5 rounded-lg"
          href={"/quiz"}
        >
          آغاز یادگیری
        </Link>
        |
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex items-center gap-x-1 hover:text-primary transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`size-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6 9 6 6 6-6"
              />
            </svg>
            بیشتر
          </button>
          {moreOpen && (
            <div
              dir="rtl"
              className="absolute top-full right-0 z-50 mt-2 flex min-w-40 flex-col gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-lg"
            >
              {MORE_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={`rounded-lg ${link.href == "/about" && "sm:hidden"} px-3 py-2 text-sm font-normal hover:bg-accent/70 transition-all`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link className=" hover:text-primary transition-all" href={"/guide"}>
          راهنما
        </Link>
        <Link
          className=" sm:block hidden hover:text-primary transition-all"
          href={"/about"}
        >
          درباره
        </Link>
      </motion.div>
    </nav>
  );
}

export default Header;
