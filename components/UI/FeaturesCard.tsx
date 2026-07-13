"use client";
import React from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";

type FeaturesCardType = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  bgColor: string;
  variants: Variants;
};

function FeaturesCard({
  title,
  desc,
  icon,
  bgColor,
  variants,
}: FeaturesCardType) {
  return (
    <motion.div
      variants={variants}
      className=" hover:scale-102 transition-all space-y-1 glass rounded-2xl z-20 relative text-right p-6"
    >
      <div
        className={`${bgColor} rounded-xl size-12 flex items-center justify-center ml-auto`}
      >
        <div className="w-6 h-6">{icon}</div>
      </div>
      <h3 className=" font-semibold text-lg"> {title}</h3>
      <p className=" leading-relaxed text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

export default FeaturesCard;
