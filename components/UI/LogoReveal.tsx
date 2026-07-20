"use client";

import { useEffect, useRef, useState } from "react";
import MainLogo from "../svgs/mainLogo";

const SEEN_KEY = "sarva-logo-reveal-seen";
const TOTAL_MS = 3100;

function LogoReveal() {
  const [hidden, setHidden] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) {
      setHidden(true);
      return;
    }
    sessionStorage.setItem(SEEN_KEY, "1");

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduceMotion) {
      const mark = markRef.current;
      const target = document.getElementById("site-logo");
      if (mark && target) {
        const from = mark.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        mark.style.setProperty(
          "--fly-x",
          `${to.left + to.width / 2 - (from.left + from.width / 2)}px`,
        );
        mark.style.setProperty(
          "--fly-y",
          `${to.top + to.height / 2 - (from.top + from.height / 2)}px`,
        );
        mark.style.setProperty("--fly-scale", `${to.width / from.width}`);
      }
    }

    const timeout = setTimeout(
      () => setHidden(true),
      reduceMotion ? 900 : TOTAL_MS,
    );
    return () => clearTimeout(timeout);
  }, []);

  if (hidden) return null;

  return (
    <div id="logo-reveal" className="logo-reveal" aria-hidden="true">
      <div>
        <div ref={markRef} className="lr-mark">
          <div className="lr-clip">
            <MainLogo />
            <div className="lr-sweep"></div>
          </div>
          <div className="lr-pen">
            <svg
              viewBox="318.87 491.18 376.80 449.82"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                className="lr-pen-line"
                d="M507 941 L507 560"
                fill="none"
                stroke="#0DBFC3"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="lr-word text-3xl ">ســـروا</div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `if(sessionStorage.getItem("${SEEN_KEY}"))document.getElementById("logo-reveal").style.display="none";`,
        }}
      />
    </div>
  );
}

export default LogoReveal;
