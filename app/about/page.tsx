"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import WaveCanvas from "@/components/UI/WaveCanvas";

const EASE = [0.22, 1, 0.36, 1] as const;

function Page() {
  const shouldReduceMotion = useReducedMotion();

  const dur = (d: number) => (shouldReduceMotion ? 0.01 : d);
  const yOffset = shouldReduceMotion ? 0 : 16;

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.09,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur(0.6), ease: EASE },
    },
  };

  const boxVariants: Variants = {
    hidden: {
      opacity: 0,
      y: yOffset + 8,
      scale: shouldReduceMotion ? 1 : 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: dur(0.55), ease: EASE },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: yOffset + 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur(0.7), ease: EASE },
    },
  };

  const scaleIn: Variants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.94 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: dur(0.7), ease: EASE },
    },
  };

  return (
    <section>
      <main className=" text-center container relative">
        <div className=" relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className=" mx-auto w-fit mt-12 flex items-center flex-col"
          >
            <motion.span
              variants={itemVariants}
              className=" max-w-48  mb-3 sm:mb-0 rounded-full text-xs sm:text-sm px-4 
          font-semibold py-1 bg-primary/10 text-primary"
            >
              دربارۀ ما
            </motion.span>
            <motion.h1
              variants={itemVariants}
              dir="rtl"
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight
           mb-2 text-balance"
            >
              پاسداری از میراث
              <span className=" text-primary mr-1 inline-block">شعر پارسی</span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed text-center"
            >
              سروا زادۀ یک باور است: دانشِ کهنِ عروض نباید در قفسۀ کتاب‌ها
              بماند. اینجا وزن و آهنگِ شعر فارسی را با زبانِ امروز، گام‌به‌گام و
              شنیدنی می‌آموزی
            </motion.p>
          </motion.div>
          <div
            className="hidden dark:block  bg-primary/8 blur-3xl size-100 
        rounded-full right-20 top-0 z-100 absolute"
          ></div>
        </div>

        <motion.div
          dir="rtl"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mt-32"
        >
          <motion.div
            variants={boxVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="glass relative z-20 rounded-2xl p-6 text-center"
          >
            <div
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center
             justify-center mb-4 mx-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-target w-6 h-6 text-primary"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              هدف ما
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              عروض را از دلِ کتاب‌های دشوار بیرون بیاوریم و به مهارتی روشن و در
              دسترس بدل کنیم؛ چنان‌که هر علاقه‌مندی بتواند وزنِ شعر را بشنود و
              بشناسد
            </p>
          </motion.div>

          <motion.div
            variants={boxVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="glass relative z-20 rounded-2xl p-6 text-center"
          >
            <div
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center
             justify-center mb-4 mx-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-book-open w-6 h-6 text-gold"
                viewBox="0 0 24 24"
              >
                <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              رویکرد ما
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              یادگیری تعاملی، همراه با صدا و نمونه‌هایی از اشعارِ بزرگان. اینجا
              به‌جای حفظِ خشکِ ارکان، وزن را با گوش و تمرین تجربه می‌کنی
            </p>
          </motion.div>

          <motion.div
            variants={boxVariants}
            whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="glass relative z-20 rounded-2xl p-6 text-center"
          >
            <div
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center
             justify-center mb-4 mx-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-users w-6 h-6 text-turquoise"
                viewBox="0 0 24 24"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              جامعۀ ما
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              حلقه‌ای از دوستدارانِ ادبِ فارسی که کنارِ هم می‌آموزند و می‌سنجند؛
              جایی برای رشدِ ذوق و ژرف‌ترشدنِ درک از موسیقیِ شعر
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          className="glass z-20 relative rounded-3xl p-4 md:p-12 max-w-3xl
             mx-auto text-center flex flex-col justify-between items-center gap-y-6 mt-32"
        >
          <WaveCanvas phaseOffset={0} />

          <div className="text-center font-semibold">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-6">
              داستان ما
            </h2>
            <p className="text-muted-foreground leading-relaxed text-center mb-4">
              عروض، دانشِ شناختنِ آهنگ و وزنِ شعر است؛ همان چیزی که قرن‌ها
              راهنمای شاعرانِ این سرزمین بوده و به کلامشان نظم و موسیقی بخشیده.
              اما امروز، همین دانش برای بسیاری دور و دشوار می‌نماید — نه به‌سببِ
              پیچیدگیِ ذاتی‌اش، که به‌سببِ شیوۀ آموزشش
            </p>
            <p className="text-muted-foreground leading-relaxed text-center">
              سروا تلاشی است برای پُل‌زدن میانِ این میراثِ کهن و نسلِ امروز.
              با ابزارهای تعاملی، صدا، و طراحیِ الهام‌گرفته از هنرِ ایرانی
              کوشیده‌ایم این راه را دلنشین و آسان کنیم؛ تا وزنِ شعر را نه فقط
              بخوانی، که بشنوی و حس کنی
            </p>
          </div>

          <WaveCanvas phaseOffset={0.5} />
        </motion.div>

        <motion.div
          dir="rtl"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="max-w-5xl mx-auto flex items-center flex-col mt-32"
        >
          <motion.span
            variants={itemVariants}
            className="inline-block px-4 py-1.5 rounded-full bg-gold/20 text-gold text-sm font-medium mb-4"
          >
            سازنده و مدرس
          </motion.span>
          <motion.div
            variants={boxVariants}
            className="glass relative z-20 rounded-3xl p-6 md:p-10 grid md:grid-cols-[auto_1fr] gap-8 items-center"
          >
            <motion.div
              variants={itemVariants}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto md:mx-0"
            >
              <div className="relative w-40 flex items-center h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden ring-4 ring-primary/20 shadow-xl">
                <img
                  className=" object-cover"
                  src="/photo_5884104276857000207_x.png"
                  alt=""
                />
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="text-center md:text-right"
            >
              <h3 className="text-2xl font-bold text-foreground mb-1">
                متین جعفری
              </h3>
              <p className="text-primary font-medium mb-4">
                دبیر ادبیات فارسی و سازندۀ پلتفرم سروا
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                سال‌هاست در کلاسِ درس، از زیباییِ شعر فارسی می‌گویم و شور آن را
                با دانش‌آموزانم قسمت می‌کنم؛ و در این میان، عروض همواره
                دلرباترین بخشِ راه بوده است — آهنگی پنهان که در پسِ هر بیت
                می‌تپد. سروا را آنجا ساختم که این دو عشق به هم رسیدند: ادبیات
                و فناوری. خواستم یادگیریِ عروض از حالتِ کتابی و خشک درآید و به
                تجربه‌ای زنده، شنیدنی و ماندگار بدل شود
              </p>
              <motion.div
                variants={containerVariants}
                className="flex flex-wrap justify-center md:justify-start gap-3"
              >
                <motion.span
                  variants={itemVariants}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 px-3
    py-1.5 rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6" />
                    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
                  </svg>
                  دبیر ادبیات فارسی
                </motion.span>

                <motion.span
                  variants={itemVariants}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-pen-line w-4 h-4 text-gold"
                    aria-hidden="true"
                  >
                    <path d="M13 21h8" />
                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  </svg>
                  پژوهشگرِ عروض و قافیه
                </motion.span>

                <motion.span
                  variants={itemVariants}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-code-xml w-4 h-4 text-turquoise"
                    aria-hidden="true"
                  >
                    <path d="m18 16 4-4-4-4" />
                    <path d="m6 8-4 4 4 4" />
                    <path d="m14.5 4-5 16" />
                  </svg>
                  توسعه‌دهندۀ وب و سازندۀ سروا
                </motion.span>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className=" relative">
          <div
            className="hidden dark:block  bg-primary/8 blur-3xl size-100 
        rounded-full right-20 top-0 z-100 absolute"
          ></div>
          <motion.div
            dir="rtl"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className=" mx-auto flex items-center flex-col mt-32"
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
            >
              راه‌های ارتباطی
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground max-w-xl mx-auto"
            >
              پرسش، پیشنهاد یا نقدی دارید؟ خوشحال می‌شویم صدایتان را بشنویم؛ هر
              پیام، گامی است برای بهترشدنِ سروا
            </motion.p>
            <motion.div
              variants={containerVariants}
              className="grid w-full lg:w-[80%] md:grid-cols-3 gap-6 mt-12 mb-10"
            >
              <motion.div variants={boxVariants}>
                <Link
                  className="glass relative z-20 rounded-2xl p-6 flex flex-col items-center text-center hover:scale-[1.02] transition-transform h-full"
                  href={
                    "https://www.instagram.com/jafarimatin13?igsh=NjhsMjlqNWN3NDAw"
                  }
                >
                  <div className="w-12 h-12 rounded-xl text-primary bg-primary/10 flex items-center justify-center mb-4">
                    <svg
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.9"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6m5-2h.01"></path>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    اینستاگرام
                  </h3>
                  <p className="text-sm text-muted-foreground dir-ltr">
                    jafarimatin@
                  </p>
                </Link>
              </motion.div>

              <motion.div variants={boxVariants}>
                <Link
                  className="glass relative z-20 rounded-2xl p-6 flex flex-col items-center text-center hover:scale-[1.02] transition-transform h-full"
                  href={"https://t.me/jafarimatin"}
                >
                  <div className="w-12 text-primary h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <svg
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.9"
                      viewBox="0 0 24 24"
                    >
                      <path d="M22 3 2 11l6 2 2 6 4-4 5 4z"></path>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    تلگرام
                  </h3>
                  <p className="text-sm text-muted-foreground dir-ltr">
                    jafarimatin@
                  </p>
                </Link>
              </motion.div>

              <motion.div variants={boxVariants}>
                <Link
                  className="glass relative z-20 rounded-2xl p-6 flex flex-col items-center text-center hover:scale-[1.02] transition-transform h-full"
                  href={"mailto:matinjafaridev@gmail.com"}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center  mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="lucide lucide-mail w-6 h-6 text-primary"
                      viewBox="0 0 24 24"
                    >
                      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    ایمیل
                  </h3>
                  <p className="text-sm text-muted-foreground dir-ltr">
                    matinjafaridev@gmail.com
                  </p>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link
                className="active:scale-95 hover:brightness-90 transition-all bg-primary
           px-5 py-2 text-white justify-center rounded-xl flex items-center gap-x-2 z-20 relative my-12"
                href={"/quiz"}
              >
                شروع آزمون
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </section>
  );
}

export default Page;
