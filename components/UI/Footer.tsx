import Link from "next/link";
import React from "react";
import MainLogo from "../svgs/mainLogo";

function Footer() {
  return (
    <div className="border-t border-border py-4 sm:py-8 mt-30">
      <div className=" container flex items-center flex-col gap-y-2 sm:flex-row-reverse justify-between">
        <div className=" flex items-center gap-x-2">
          <h3 className=" text-sm md:text-base font-bold cursor-default">
            عروض‌آموز
          </h3>
          <Link
            href={"/"}
            className="bg-linear-to-br hover:brightness-90 transition-all size-8 flex items-center justify-center rounded-lg from-primary to-turquoise-light"
          >
            <div className=" size-4 text-primary-foreground">
              <MainLogo />
            </div>
          </Link>
        </div>
        <p className=" text-sm md:text-base cursor-default">
          ساخته شده با ❤️ برای عاشقان ادبیات فارسی
        </p>
      </div>
    </div>
  );
}

export default Footer;
