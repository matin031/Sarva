"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const boxVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function Page() {
  return (
    <motion.div
      dir="rtl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className=" container my-30 max-w-3xl"
    >
      <motion.div variants={itemVariants} className=" flex items-center gap-5">
        <motion.div
          variants={boxVariants}
          className=" overflow-hidden size-37.5 rounded-full border border-primary"
        >
          <img
            className=" size-full object-cover bg-center "
            src="/photo_5884104276857000207_x.jpg"
            alt=""
          />
        </motion.div>
        <div className=" flex flex-col gap-1 items-start">
          <span className=" max-w-48  mb-3 sm:mb-0 rounded-full text-xs px-4 font-semibold py-1 bg-primary/10 text-primary">
            سازندۀ عروض آموز
          </span>
          <h1 className=" font-extrabold text-3xl">متین جعفری</h1>
          <p className=" text-muted-foreground">دبیر ادبیات فارسی</p>
        </div>
      </motion.div>

      <motion.div
        variants={boxVariants}
        className=" py-7.5 px-8 text-muted-foreground relative glass z-20 mt-10 rounded-xl"
      >
        <h2 className=" font-extrabold text-xl text-primary">دربارۀ من</h2>
        <p>
          سال‌هاست که در کلاس‌های ادبیات، عروض را همان جایی می‌دیدم که چشمِ
          دانش‌آموزان خسته می‌شد. عروض، علمِ موسیقیِ شعر است؛ اما همیشه با
          جدول‌های خشک و قاعده‌های حفظی آموزش داده می‌شد. عروض‌آموز را ساختم تا
          وزن شعر فارسی را با گوش و چشم، و به‌شکلی تعاملی یاد بگیریم.
        </p>
        <p>
          اینجا هر بیت را می‌شنوی، تقطیع می‌کنی و وزنش را تشخیص می‌دهی؛ و کم‌کم
          گوشَت با ریتم اشعار حافظ، سعدی و فردوسی آشنا می‌شود. امیدوارم این
          پلتفرم همان لذتی را به تو بدهد که خواندن یک بیتِ خوش‌آهنگ به من
          می‌دهد.
        </p>
      </motion.div>

      <motion.div
        variants={boxVariants}
        className=" py-7.5 px-8 text-muted-foreground relative glass z-20 mt-10 rounded-xl"
      >
        <h2 className=" font-extrabold text-xl text-primary mb-5">
          راه‌های ارتباط
        </h2>
        <motion.div
          variants={containerVariants}
          className=" grid sm:grid-cols-2 gap-5"
        >
          <motion.div
            variants={itemVariants}
            className=" brightness-70 hover:border-primary/50  transition-all hover:brightness-100 flex items-center gap-2 border rounded-xl bg-primary/10 py-2 px-4"
          >
            <div
              className=" shrink-0 text-primary size-10.5 bg-primary/20 rounded-xl flex 
            items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div>
              <span className=" text-sm text-muted-foreground">ایمیل</span>
              <span className=" text-sm text-black/80 dark:text-white/80 block">
                matinjafaridev@gmail.com
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href={"https://t.me/jafarimatin"}
              className="brightness-70 hover:border-primary/50 relative transition-all hover:brightness-100 flex items-center gap-2 border rounded-xl bg-primary/10 py-2 px-4"
            >
              <div
                className=" shrink-0 text-primary size-10.5 bg-primary/20 rounded-xl flex 
            items-center justify-center"
              >
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
              <div>
                <span className=" text-sm text-muted-foreground">تلگرام</span>
                <span className=" text-sm text-black/80 dark:text-white/80 block">
                  jafarimatin@
                </span>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href={
                "https://www.instagram.com/jafarimatin13?igsh=NjhsMjlqNWN3NDAw"
              }
              className="brightness-70 hover:border-primary/50 relative transition-all hover:brightness-100 flex items-center gap-2 border rounded-xl bg-primary/10 py-2 px-4"
            >
              <div
                className=" shrink-0 text-primary size-10.5 bg-primary/20 rounded-xl flex 
            items-center justify-center"
              >
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
              <div>
                <span className=" text-sm text-muted-foreground">
                  اینستاگرام
                </span>
                <span className=" text-sm text-black/80 dark:text-white/80 block">
                  jafarimatin13
                </span>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link
              href={"https://web.eitaa.com/#@jafariMatin1"}
              className="brightness-70 hover:border-primary/50 relative transition-all hover:brightness-100 flex items-center gap-2 border rounded-xl bg-primary/10 py-2 px-4"
            >
              <div
                className=" shrink-0 text-primary size-10.5 bg-primary/20 rounded-xl flex 
            items-center justify-center"
              >
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
              <div>
                <span className=" text-sm text-muted-foreground">ایتا</span>
                <span className=" text-sm text-black/80 dark:text-white/80 block">
                  jafarimatin1@
                </span>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default Page;
