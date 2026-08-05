"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function PanelNavigation() {
  const PanelNavigationItems = [
    {
      id: 1,
      title: "پنل",
      src: "home",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      ),
    },
    {
      id: 2,
      title: "تنظیمات",
      src: "setting",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      ),
    },
    {
      id: 3,
      title: "واژگان",
      src: "vocab",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V6a1.5 1.5 0 0 1 1.5-1.5h6.75"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.25 4.5h6a1.5 1.5 0 0 1 1.5 1.5v6.75m0 0v6a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-1.5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12.75 3.659-3.659a1.5 1.5 0 0 1 2.122 0L10.5 11.16"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.2c0-.85.75-1.5 1.65-1.4.8.08 1.45.68 1.55 1.35.1.7-.3 1.25-.8 1.55-.45.3-.8.65-.8 1.18v.3"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.2 15.3h.008"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 6h.008v.008H7.5V6Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      ),
    },
    {
      id: 4,
      title: "جاسوس",
      src: "jasoos",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" strokeWidth={0} />
          <path
            strokeLinecap="round"
            d="M12 2.25v3.5M12 18.25v3.5M2.25 12h3.5M18.25 12h3.5"
          />
        </svg>
      ),
    },
    {
      id: 5,
      title: "آزمون‌نهایی",
      src: "exam",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 12.75V19.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V4.5A1.5 1.5 0 0 1 6 3h6.75"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 15 .6-2.7a1.2 1.2 0 0 1 .32-.58l7.4-7.4a1.7 1.7 0 0 1 2.4 2.4l-7.4 7.4a1.2 1.2 0 0 1-.58.32L9 15Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.5 6.25 1.75 1.75"
          />
        </svg>
      ),
    },
    {
      id: 7,
      title: "سروا کلاب",
      src: "club",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h9a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5h-6L5 21v-3.5A2.5 2.5 0 0 1 4 15V5.5Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h6M8 11.5h4" />
        </svg>
      ),
    },
    {
      id: 6,
      title: "عروض",
      src: "aruz",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className=" size-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
          />
        </svg>
      ),
    },
  ];

  const pathName = usePathname();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [style, setStyle] = useState({
    w: 0,
    l: 0,
  });
  useEffect(() => {
    const activeIndex = PanelNavigationItems.findIndex(
      (i) => pathName == `/panel/${i.src}`,
    );
    const node = itemRefs.current[activeIndex];
    node &&
      setStyle({
        w: node.offsetWidth,
        l: node.offsetLeft,
      });
  }, [pathName]);
  return (
    <div className=" w-full sticky top-20 z-999">
      <div
        className="relative w-full md:w-2/4 mx-auto glass rounded-xl
     flex justify-between p-4 sm:px-6 items-center"
      >
        {PanelNavigationItems.map((l, i) => (
          <div
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            key={l.id}
            className={`${pathName == `/panel/${l.src}` && "text-primary size-9"} group size-7 rounded-xl  relative`}
          >
            <Link href={`/panel/${l.src}`}>{l.icon}</Link>
            <div
              className=" opacity-0 group-hover:opacity-100 delay-500 absolute text-sm rounded-xl px-3 -bottom-10 left-1/2
    -translate-x-1/2 transition-all text-muted-foreground"
            >
              {l.title}
            </div>
          </div>
        ))}
        <div
          style={{
            left: style.l - 7,
          }}
          className={` transition-all duration-500 bg-primary/10 size-12 rounded-xl absolute`}
        ></div>
      </div>
    </div>
  );
}

export default PanelNavigation;
