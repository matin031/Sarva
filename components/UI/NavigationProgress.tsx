"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.3 });

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // وقتی صفحه عوض شد، نوار رو تموم کن
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // وقتی روی لینک کلیک شد، نوار رو شروع کن
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.target &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const targetPath = new URL(target.href).pathname;
        if (targetPath !== pathname) {
          NProgress.start();
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return null;
}
