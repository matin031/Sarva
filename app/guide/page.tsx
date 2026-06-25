"use client";

import { motion, type Variants } from "framer-motion";
import FakeCircularVisualizer from "@/components/UI/guide/FakeCircularVisualizer";
import { FakeWaveform } from "@/components/UI/guide/FakeWaveform";

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
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function Page() {
  return (
    <main className=" container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className=" mt-10 max-w-2xl text-center mx-auto"
      >
        <motion.span
          variants={itemVariants}
          className=" cursor-default  mb-3 sm:mb-0 rounded-full text-xs px-4 font-semibold py-1 bg-primary/10 text-primary"
        >
          راهنمای یادگیری
        </motion.span>
        <motion.h1
          variants={itemVariants}
          className=" text-3xl text-black font-extrabold dark:text-white"
        >
          سایت چطور کار می‌کند؟
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className=" text-muted-foreground text-base sm:text-lg"
        >
          در عروض‌آموز با گوش و چشم وزن شعر را تمرین می‌کنی. دو نوع سوال وجود
          دارد؛ هرکدام را همین‌جا به‌صورت زنده امتحان کن — می‌توانی ضرب‌آهنگ‌ها
          را <span className=" text-primary">بشنوی</span> و گزینهٔ درست را
          انتخاب کنی
        </motion.p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className=" p-4 md:p-8 mx-auto mt-10 glass relative z-20 border
       border-primary/30 rounded-xl w-full lg:w-[70%]"
      >
        <motion.div
          variants={itemVariants}
          className=" flex items-center justify-end gap-x-2 sm:gap-x-4"
        >
          <p className=" sm:text-xl md:text-2xl">
            بیت را می‌بینی، ضرب‌آهنگش را پیدا کن
          </p>
          <div
            className=" bg-primary/20 size-8 sm:size-10 rounded-lg md:rounded-xl
           border border-primary flex justify-center items-center"
          >
            {(1).toLocaleString("fa-IR")}
          </div>
        </motion.div>
        <motion.p
          variants={itemVariants}
          className=" text-sm sm:text-base text-muted-foreground"
        >
          یک بیت نمایش داده می‌شود و چهار ضرب‌آهنگ پیشِ روی توست. هرکدام را پخش
          کن و آن وزنی را که با موسیقیِ بیت می‌خواند انتخاب کن
        </motion.p>
        <motion.div
          variants={boxVariants}
          className="bg-primary/10 border border-primary/20 rounded-xl p-3 md:p-6 mt-6"
        >
          <h3 className=" text-xl sm:text-2xl">دیر آمدی ای نگار سر مست</h3>
          <motion.div
            variants={containerVariants}
            className=" mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <FakeWaveform active={true} />
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-start p-2 sm:p-6 items-center
    rounded-xl bg-card border-2 border-border
    relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <FakeWaveform />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className=" p-4 md:p-8 mx-auto mt-10 glass relative z-20 border border-primary/30 rounded-xl w-full lg:w-[70%]"
      >
        <motion.div
          variants={itemVariants}
          className=" flex items-center justify-end gap-x-2 sm:gap-x-4"
        >
          <p className=" sm:text-xl md:text-2xl">
            ضرب‌آهنگ را می‌شنوی، بیتش را پیدا کن
          </p>
          <div
            className=" bg-primary/20 size-8 sm:size-10 rounded-lg md:rounded-xl
           border border-primary flex justify-center items-center"
          >
            {(2).toLocaleString("fa-IR")}
          </div>
        </motion.div>
        <motion.p
          variants={itemVariants}
          className=" text-sm sm:text-base text-muted-foreground"
        >
          یک بیت نمایش داده می‌شود و چهار ضرب‌آهنگ پیشِ روی توست. هرکدام را پخش
          کن و آن وزنی را که با موسیقیِ بیت می‌خواند انتخاب کن
        </motion.p>

        <motion.div
          variants={boxVariants}
          className="bg-primary/10 border border-primary/20 rounded-xl p-3 md:p-6 mt-6"
        >
          <div className=" w-full flex items-center justify-center">
            <FakeCircularVisualizer />
          </div>
          <motion.div
            variants={containerVariants}
            className=" mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>سرو چمان من چرا میل چمن نمی‌کند</p>
                <p className="mr-auto">همدم گل نمی‌شود یاد سمن نمی‌کند</p>
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>سرو چمان من چرا میل چمن نمی‌کند</p>
                <p className="mr-auto">همدم گل نمی‌شود یاد سمن نمی‌کند</p>
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>سرو چمان من چرا میل چمن نمی‌کند</p>
                <p className="mr-auto">همدم گل نمی‌شود یاد سمن نمی‌کند</p>
              </div>
            </motion.div>
            <motion.div
              variants={itemVariants}
              dir="rtl"
              className="gap-x-3 h-full px-3 py-6 flex justify-center items-center
        rounded-xl bg-card border-2 border-border
        relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full"
            >
              <div className="w-full flex flex-col text-sm sm:text-base">
                <p>سرو چمان من چرا میل چمن نمی‌کند</p>
                <p className="mr-auto">همدم گل نمی‌شود یاد سمن نمی‌کند</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default Page;
