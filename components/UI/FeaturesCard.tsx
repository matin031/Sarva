"use client";
import React from "react";
import { motion } from "motion/react";

import FeaturesSectionIconFirst from "../svgs/FeaturesSectionIconFirst";

interface FeaturesCardType {
  title: string;
  desc: string;
  bgColor: string;
  icon: React.ReactNode;
  transition: {
    duration: number;
    delay: number;
  };
}
function FeaturesCard({
  title,
  desc,
  icon,
  bgColor,
  transition,
}: FeaturesCardType) {
  return (
    <motion.div
      initial={{ y: 40 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={transition}
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
