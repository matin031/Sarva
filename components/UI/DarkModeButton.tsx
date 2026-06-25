"use client";

import { useEffect, useState } from "react";

function DarkModeButton() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // بارگذاری تم از localStorage + جلوگیری از hydration mismatch
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    let shouldBeDark = false;

    if (savedTheme === "dark") {
      shouldBeDark = true;
    } else if (savedTheme === "light") {
      shouldBeDark = false;
    } else {
      shouldBeDark = systemDark;
    }

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setIsDark(shouldBeDark);
    setMounted(true);
  }, []);

  const toggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!mounted) return;

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const nextIsDark = !isDark;

    // ذخیره در localStorage
    localStorage.setItem("theme", nextIsDark ? "dark" : "light");

    if (!document.startViewTransition) {
      document.documentElement.classList.toggle("dark");
      setIsDark(nextIsDark);
      return;
    }

    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle("dark");
      setIsDark(nextIsDark);
    });

    await transition.ready;

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    if (nextIsDark) {
      document.documentElement.animate(
        { clipPath },
        {
          duration: 400,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } else {
      const style = document.createElement("style");
      style.textContent = `
        ::view-transition-new(root) { z-index: 1; }
        ::view-transition-old(root) { z-index: 9999; }
      `;
      document.head.appendChild(style);

      document.documentElement
        .animate(
          { clipPath: [...clipPath].reverse() },
          {
            duration: 400,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-old(root)",
          },
        )
        .finished.then(() => style.remove());
    }
  };

  // اگر هنوز لود نشده، دکمه رو نشون نده تا flicker پیش نیاد
  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggle}
      className="p-2 group rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="hidden dark:block w-5 h-5 group-hover:-rotate-12 transition-all"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        className="block dark:hidden w-5 h-5 group-hover:-rotate-12 transition-all"
        viewBox="0 0 24 24"
      >
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      </svg>
    </button>
  );
}

export default DarkModeButton;
