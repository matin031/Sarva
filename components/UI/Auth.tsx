"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import LoginForm from "./MobileLoginForm";
import SignUp from "./SignUp";

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

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const handleSuccess = (mobile: string) => {
    console.log("شماره موبایل تأیید شد:", mobile);
  };

  return (
    <AnimatePresence mode="wait">
      {!isLogin ? (
        <motion.div
          key="signup"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center mt-10 mx-auto"
        >
          <motion.span
            variants={itemVariants}
            className=" cursor-default max-w-48 mb-3 sm:mb-0 rounded-full text-xs px-4 font-semibold py-1 bg-primary/10 text-primary"
          >
            رایگان و سریع
          </motion.span>
          <motion.h1
            variants={itemVariants}
            className=" cursor-default font-extrabold text-3xl text-muted-foreground dark:text-white"
          >
            ساخت حساب کاربری
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className=" cursor-default text-muted-foreground"
          >
            سفر یادگیری عروض را امروز آغاز کن
          </motion.p>
          <motion.div
            variants={itemVariants}
            className=" flex items-center justify-center w-full"
          >
            <SignUp setIsLogin={setIsLogin} onSuccess={handleSuccess} />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="login"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col  items-center justify-center mt-10 mx-auto"
        >
          <motion.span
            variants={itemVariants}
            className=" cursor-default max-w-48 mb-3 sm:mb-0 rounded-full text-xs px-4 font-semibold py-1 bg-primary/10 text-primary"
          >
            خوش آمدید
          </motion.span>
          <motion.h1
            variants={itemVariants}
            className=" cursor-default font-extrabold text-3xl text-muted-foreground dark:text-white"
          >
            ورود به عروض‌آموز
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className=" cursor-default text-muted-foreground"
          >
            برای ادامهٔ یادگیری وارد حساب خود شو
          </motion.p>
          <motion.div
            variants={itemVariants}
            className=" flex items-center justify-center w-full"
          >
            <LoginForm setIsLogin={setIsLogin} onSuccess={handleSuccess} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Auth;
