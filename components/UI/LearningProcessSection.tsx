"use client";
import { useKeenSlider, KeenSliderPlugin } from "keen-slider/react";
import { motion } from "motion/react";
import "keen-slider/keen-slider.min.css";
import { useEffect } from "react";
import {
  fadeUp,
  scaleIn,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";
import "keen-slider/keen-slider.min.css";

const WheelControls: KeenSliderPlugin = (slider) => {
  let touchTimeout: ReturnType<typeof setTimeout>;
  let position: {
    x: number;
    y: number;
  };
  let wheelActive: boolean;

  function dispatch(e: WheelEvent, name: string) {
    position.x -= e.deltaX;
    position.y -= e.deltaY;
    slider.container.dispatchEvent(
      new CustomEvent(name, {
        detail: {
          x: position.x,
          y: position.y,
        },
      }),
    );
  }

  function wheelStart(e: WheelEvent) {
    position = {
      x: e.pageX,
      y: e.pageY,
    };
    dispatch(e, "ksDragStart");
  }

  function wheel(e: WheelEvent) {
    dispatch(e, "ksDrag");
  }

  function wheelEnd(e: WheelEvent) {
    dispatch(e, "ksDragEnd");
  }

  function eventWheel(e: WheelEvent) {
    e.preventDefault();
    if (!wheelActive) {
      wheelStart(e);
      wheelActive = true;
    }
    wheel(e);
    clearTimeout(touchTimeout);
    touchTimeout = setTimeout(() => {
      wheelActive = false;
      wheelEnd(e);
    }, 3000);
  }

  slider.on("created", () => {
    slider.container.addEventListener("wheel", eventWheel, {
      passive: false,
    });
  });
};
function LearningProcessSection() {
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      rubberband: false,
      vertical: true,
      drag: false,
    },
    [WheelControls],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      instanceRef.current?.next();
    }, 3000);

    return () => clearInterval(interval);
  }, [instanceRef]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
      className=" my-20 bg-secondary/30 py-16"
    >
      <div className="container">
        <h2 className=" text-2xl sm:text-3xl md:text-4xl font-bold text-center">
          نحوه یادگیری
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto text-base font-[550]">
          با پاسخ به سوالات تعاملی، اوزان عروضی را به صورت عملی بیاموزید
        </p>
        <div
          ref={sliderRef}
          className="keen-slider glass mx-auto max-w-full md:max-w-[60%] lg:max-w-[50%] max-h-87.5 lg:max-h-75
           relative z-20 rounded-3xl mt-10 overflow-hidden"
        >
          <div
            className="keen-slider__slide w-full h-full number-slide1 cursor-default gap-y-3 p-3 sm:p-8 flex
           items-center justify-center flex-col "
          >
            <div className=" text-center">
              <p className=" text-xs sm:text-base">
                وزن مصراع زیر، از تکرار کدام رکن (پایه آوایی) پدید آمده است؟
              </p>

              <p className=" text-lg sm:text-xl lg:text-2xl">
                وقتی اندر سر کویی گذری بود مرا
              </p>
            </div>
            <span className=" text-xs sm:text-sm text-muted-foreground">
              تشخیص وزن -
            </span>
            <div className=" grid grid-cols-2 gap-4 *:w-full w-full">
              <div className="p-4 rounded-xl border-2  border-primary bg-primary/10">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="keen-slider__slide w-full h-full number-slide1 cursor-default gap-y-3 p-5 sm:p-8 flex
           items-center justify-center flex-col "
          >
            <div className=" text-center">
              <p className=" text-xs sm:text-base">
                وزن مصراع زیر، از تکرار کدام رکن (پایه آوایی) پدید آمده است؟
              </p>

              <p className=" text-lg sm:text-xl lg:text-2xl">
                ای ساربان آهسته ران کآرام جانم می‌رود
              </p>
            </div>
            <span className=" text-xs sm:text-sm text-muted-foreground">
              تشخیص وزن -
            </span>
            <div className=" grid grid-cols-2 gap-4 *:w-full w-full">
              <div className="p-4 rounded-xl border-2  border-primary bg-primary/10">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            className="keen-slider__slide w-full h-full number-slide1 cursor-default gap-y-3 p-5 sm:p-8 flex
           items-center justify-center flex-col "
          >
            <div className=" text-center">
              <p className=" text-xs sm:text-base">
                وزن مصراع زیر، از تکرار کدام رکن (پایه آوایی) پدید آمده است؟
              </p>
              <p className=" text-lg sm:text-xl lg:text-2xl">
                {" "}
                دوش می‌آمد و رخساره برافروخته بود
              </p>
            </div>
            <span className=" text-xs sm:text-sm text-muted-foreground">
              تشخیص وزن -
            </span>
            <div className=" grid grid-cols-2 gap-4 *:w-full w-full">
              <div className="p-4 rounded-xl border-2  border-primary bg-primary/10">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border-2 border-border bg-card">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs 
                bg-secondary text-secondary-foreground border border-border"
                  >
                    ∪
                  </span>
                  <span
                    className="w-5 h-5 rounded-full flex items-center 
                justify-center text-xs bg-primary text-primary-foreground"
                  >
                    —
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default LearningProcessSection;
