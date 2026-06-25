"use client";
import { motion } from "motion/react";
import MainLogo from "../svgs/mainLogo";
import Link from "next/link";
import DarkModeButton from "./DarkModeButton";

function Header() {
  return (
    <nav className="  mt-4 flex justify-between items-center flex-row-reverse container">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className=" flex items-center gap-x-2"
      >
        <h3 className=" hidden sm:block text-xl font-bold">عروض‌آموز</h3>
        <Link
          href={"/"}
          className="bg-linear-to-br hover:brightness-90 transition-all size-10 flex items-center justify-center rounded-lg from-primary to-turquoise-light"
        >
          <div className=" w-5 h-5 text-primary-foreground">
            <MainLogo />
          </div>
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className=" font-semibold flex  items-center gap-x-4"
      >
        <DarkModeButton />
        <Link
          href={"/auth"}
          className="active:scale-95  px-4 py-1 rounded-lg text-sm transition-all glass hover:bg-accent/70!"
        >
          ورود
        </Link>
        <Link
          className="active:scale-95 hover:brightness-90 xs:block hidden transition-all text-sm bg-primary text-white py-1 px-5 rounded-lg"
          href={"/quiz"}
        >
          آغاز یادگیری
        </Link>
        |
        <Link className=" hover:text-primary transition-all" href={"/guide"}>
          راهنما
        </Link>
        <Link className=" hover:text-primary transition-all" href={"/about"}>
          درباره
        </Link>
      </motion.div>
    </nav>
  );
}

export default Header;
