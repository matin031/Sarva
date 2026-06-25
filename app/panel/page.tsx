import Link from "next/link";
import React from "react";

function page() {
  return (
    <main dir="rtl" className=" mt-10 container">
      <div className=" flex items-end justify-between">
        <div className=" cursor-default flex items-start flex-col">
          <span className=" text-muted-foreground">پنل کاربری</span>
          <div className=" text-3xl gap-x-2 flex items-center">
            <span>درود،</span>
            <h1>سعدی شیرازی</h1>
          </div>
          <p className=" text-muted-foreground">
            بیا امروز هم چند بیت را وزن‌یابی کنیم.
          </p>
        </div>
        <Link
          className=" group  items-center inline-flex px-5 py-3 rounded-xl gap-x-2 font-bold brightness-90 hover:brightness-100 transition-all bg-primary text-black"
          href={"/quiz"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6 group-hover:translate-x-0.5 transition-all"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          آغاز آزمون جدید
        </Link>
      </div>
    </main>
  );
}

export default page;
