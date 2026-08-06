"use client";

import { useEffect, useRef, useState } from "react";
import MainLogo from "../svgs/mainLogo";

const SEEN_KEY = "sarva-logo-reveal-seen";
const TOTAL_MS = 3100;

function LogoReveal() {
  // Render nothing on the server and on the first client render, then show
  // the intro only after mount. This avoids a hydration mismatch (the old
  // version rendered the overlay on the server and mutated it with an
  // inline script before React hydrated) and it also means repeat visits
  // never flash the overlay at all.
  const [show, setShow] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) return; // already played this session
    sessionStorage.setItem(SEEN_KEY, "1");
    // Announce that the screen is about to be covered. A page whose own
    // entrance animation is longer than a blink has no other way to know it
    // would be playing behind this overlay — سروا کلاب's book waits on it.
    // Set here rather than in the render effect below so it is in place before
    // any timer of this commit fires.
    document.documentElement.dataset.sarvaIntro = "playing";
    // one-time sync with sessionStorage on mount, not derived state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      const mark = markRef.current;
      const target = document.getElementById("site-logo");
      if (mark && target) {
        const from = mark.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        mark.style.setProperty("--fly-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
        mark.style.setProperty("--fly-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
        mark.style.setProperty("--fly-scale", `${to.width / from.width}`);
      }
    }

    const done = () => {
      setShow(false);
      delete document.documentElement.dataset.sarvaIntro;
      window.dispatchEvent(new Event("sarva:intro-done"));
    };
    const timeout = setTimeout(done, reduceMotion ? 900 : TOTAL_MS);
    return () => clearTimeout(timeout);
  }, [show]);

  if (!show) return null;

  return (
    <div id="logo-reveal" className="logo-reveal" aria-hidden="true">
      <div>
        <div ref={markRef} className="lr-mark">
          <div className="lr-clip">
            <MainLogo />
            {/* the sweep is masked to the logo, otherwise the highlight paints
                the square box around it and the box is what you notice */}
            <div className="lr-sweep-wrap">
              <div className="lr-sweep"></div>
            </div>
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
    </div>
  );
}

export default LogoReveal;
