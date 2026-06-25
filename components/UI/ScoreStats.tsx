"use client";
import { motion } from "framer-motion";
import { toFa } from "./CircularProgress";

function ScoreStats({ score, total }: { score: number; total: number }) {
  return (
    <motion.div
      dir="rtl"
      className="*:flex *:flex-col *:items-center w-full mt-10 grid grid-cols-1 [@media(min-width:380px)]:grid-cols-3 gap-x-3
         *:rounded-xl *:bg-secondary/50 gap-y-3 *:p-1 *:py-2 xs:*:p-4 *:-space-y-3"
    >
      <motion.div
        initial={{ opacity: 0, y: 70 }}
        animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
        transition={{ type: "spring" }}
      >
        <span className=" text-primary text-2xl font-bold">{toFa(score)}</span>
        <span className=" text-xs text-muted-foreground">پاسخ درست</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
        transition={{ type: "spring" }}
      >
        <span className=" text-2xl font-bold">{toFa(total - score)}</span>
        <span className=" text-xs text-muted-foreground">پاسخ نادرست</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
        transition={{ type: "spring" }}
      >
        <span className=" text-gold text-2xl font-bold">{toFa(total)}</span>
        <span className=" text-xs text-muted-foreground">همۀ پرسش‌ها</span>
      </motion.div>
    </motion.div>
  );
}

export default ScoreStats;
