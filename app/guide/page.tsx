"use client";

import { motion, type Variants } from "framer-motion";
import FakeCircularVisualizer from "@/components/UI/guide/FakeCircularVisualizer";
import { FakeWaveform } from "@/components/UI/guide/FakeWaveform";

// همه‌چیز روی فنر حرکت می‌کند، نه ease خطی؛ حس ضرب و زنده‌بودن می‌دهد
const springPunchy = {
  type: "spring",
  stiffness: 340,
  damping: 22,
  mass: 0.7,
} as const;
const springSoft = {
  type: "spring",
  stiffness: 220,
  damping: 26,
  mass: 0.8,
} as const;

const headerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

// بلوک هر سوال با یک "ورود ضربه‌ای" از پایین می‌آید، نه یک fade ملایم
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

// استاگر کارت‌ها با ریتم کوتاه-کوتاه-بلند (مثل رکن «مفتعلن») تا خودِ حرکت هم یک ضرب‌آهنگ باشد
const cardsContainer: Variants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.1, staggerChildren: 0.09 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.9, rotate: -1.5 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: springPunchy,
  },
};

// نشان شماره‌ی هر سوال مثل یک مترونوم به‌آرامی ضرب می‌گیرد — امضای بصری صفحه
const beatBadge: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      repeatDelay: 0.6,
      ease: "easeInOut",
    },
  },
};

const questions = [
  {
    id: 1,
    title: "بیت را می‌بینی، ضرب‌آهنگش را پیدا کن",
    desc: "یک بیت نمایش داده می‌شود و چهار ضرب‌آهنگ در اختیار توست؛ هرکدام را پخش کن و وزنی را که با موسیقیِ بیت هم‌خوانی دارد انتخاب کن",
  },
  {
    id: 2,
    title: "ضرب‌آهنگ را می‌شنوی، بیتش را پیدا کن",
    desc: "یک ضرب‌آهنگ پخش می‌شود و چهار بیت پیشِ روی توست. به موسیقیِ ضرب‌آهنگ گوش کن و بیتی را که با همان وزن سروده شده انتخاب کن",
  },
  {
    id: 3,
    title: "ضرب‌آهنگ را می‌شنوی، وزنش را پیدا کن",
    desc: "یک ضرب‌آهنگ پخش می‌شود و چهار وزن مختلف پیشِ روی توست. باید از میان گزینه‌ها، وزنی را انتخاب کنی که با ضرب‌آهنگ پخش‌شده مطابقت دارد",
  },
];

function Page() {
  return (
    <main className=" container">
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className=" mt-10 max-w-2xl text-center mx-auto"
      >
        <motion.span
          variants={headerItem}
          className=" cursor-default mb-3 sm:mb-0 rounded-full text-xs px-4 font-semibold py-1 bg-primary/10 text-primary"
        >
          راهنمای یادگیری
        </motion.span>
        <motion.h1
          variants={headerItem}
          className=" text-3xl text-black font-extrabold dark:text-white"
        >
          سایت چطور کار می‌کند؟
        </motion.h1>
        <motion.p
          variants={headerItem}
          className=" text-muted-foreground text-base sm:text-lg"
        >
          در عروض‌آموز با گوش و چشم وزن شعر را تمرین می‌کنی. سه نوع سوال وجود
          دارد؛ هرکدام را در نمونه‌های زیر ببین— می‌توانی ضرب‌آهنگ‌ها را{" "}
          <span className=" text-primary">بشنوی</span> و گزینهٔ درست را انتخاب
          کنی
        </motion.p>
      </motion.div>

      {/* سوال ۱ */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className=" p-4 md:p-8 mx-auto mt-10 glass relative z-20 border
       border-primary/30 rounded-xl w-full lg:w-[70%]"
      >
        <div className=" flex items-center justify-end gap-x-2 sm:gap-x-4">
          <p className=" sm:text-xl md:text-2xl">{questions[0].title}</p>
          <motion.div
            variants={beatBadge}
            animate="animate"
            className=" bg-primary/20 size-8 sm:size-10 rounded-lg md:rounded-xl
           border border-primary flex justify-center items-center"
          >
            {(1).toLocaleString("fa-IR")}
          </motion.div>
        </div>
        <p className=" text-sm sm:text-base text-muted-foreground">
          {questions[0].desc}
        </p>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 md:p-6 mt-6">
          <h3 className=" text-xl sm:text-2xl">دیر آمدی ای نگار سر مست</h3>
          <motion.div
            variants={cardsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className=" mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 cursor-pointer w-full"
            >
              <FakeWaveform active={true} />
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* سوال ۲ */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className=" p-4 md:p-8 mx-auto mt-10 glass relative z-20 border border-primary/30 rounded-xl w-full lg:w-[70%]"
      >
        <div className=" flex items-center justify-end gap-x-2 sm:gap-x-4">
          <p className=" sm:text-xl md:text-2xl">{questions[1].title}</p>
          <motion.div
            variants={beatBadge}
            animate="animate"
            className=" bg-primary/20 size-8 sm:size-10 rounded-lg md:rounded-xl
           border border-primary flex justify-center items-center"
          >
            {(2).toLocaleString("fa-IR")}
          </motion.div>
        </div>
        <p className=" text-sm sm:text-base text-muted-foreground">
          {questions[1].desc}
        </p>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 md:p-6 mt-6">
          <div className=" w-full flex items-center justify-center">
            <FakeCircularVisualizer />
          </div>
          <motion.div
            variants={cardsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className=" mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>سرو چمان من چرا میل چمن نمی‌کند</p>
                <p className="mr-auto">همدم گل نمی‌شود یاد سمن نمی‌کند</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>جهان به مجلس مستان بی خرد ماند</p>
                <p className="mr-auto">که در شکنجه بود هرکسی که آگاه است</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>به تو حاصلی ندارد غم روزگار گفتن</p>
                <p className="mr-auto">که شبی نخفته باشی به درازنای سالی</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>نه خلاف عهد کردم که حدیث جز تو گفتم</p>
                <p className="mr-auto">همه بر سر زبانند و تو در میان جانی</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* سوال ۳ */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className=" p-4 md:p-8 mx-auto mt-10 glass relative z-20 border border-primary/30 rounded-xl w-full lg:w-[70%]"
      >
        <div className=" flex items-center justify-end gap-x-2 sm:gap-x-4">
          <p className=" sm:text-xl md:text-2xl">{questions[2].title}</p>
          <motion.div
            variants={beatBadge}
            animate="animate"
            className=" bg-primary/20 size-8 sm:size-10 rounded-lg md:rounded-xl
           border border-primary flex justify-center items-center"
          >
            {(3).toLocaleString("fa-IR")}
          </motion.div>
        </div>
        <p className=" text-sm sm:text-base text-muted-foreground">
          {questions[2].desc}
        </p>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 md:p-6 mt-6">
          <div className=" w-full flex items-center justify-center">
            <FakeCircularVisualizer />
          </div>
          <motion.div
            variants={cardsContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className=" mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>مفتعلن مفاعلن مفتعلن مفاعلن</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>مفتعلن فاعلات مفتعلن فع</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: -0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>مفتعلن مفتعلن مفتلعن مفتعلن</p>
              </div>
            </motion.div>
            <motion.div
              variants={cardItem}
              whileHover={{ scale: 1.04, rotate: 0.5 }}
              whileTap={{ scale: 0.98 }}
              transition={springPunchy}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>مفتعلن فاعلن مفتعلن فاعلن</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}

export default Page;
