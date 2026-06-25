("use client");
import { motion } from "framer-motion";

function stars() {
  return (
    <motion.div className="flex gap-x-5 items-center">
      <motion.svg
        width="32"
        height="32"
        className="text-gold"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, rotate: -30, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
      >
        <path fill="currentColor" d="m12 2 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" />
      </motion.svg>

      <motion.svg
        width="48"
        height="48"
        className="text-primary"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0, duration: 0.6, type: "spring" }}
      >
        <path fill="currentColor" d="m12 2 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" />
      </motion.svg>

      <motion.svg
        width="32"
        height="32"
        className="text-gold"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, rotate: 30, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
      >
        <path fill="currentColor" d="m12 2 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" />
      </motion.svg>
    </motion.div>
  );
}

export default stars;
