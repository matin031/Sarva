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

function Auth({
  googleEnabled,
  /** مقصدِ بعد از ورود؛ سرور آن را از allowlist رد کرده است. */
  returnTo = "/panel/home",
}: {
  googleEnabled: boolean;
  returnTo?: string;
}) {
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
          dir="rtl"
          className="mx-auto mt-10 flex flex-col items-center justify-center"
        >
          {/* ⚠️ فقط تیتر. «قرصِ کوچکِ بالای تیتر + تیتر + زیرعنوانِ خاکستری»
              قالبِ آشنای صفحه‌های قالبی است و هر سه‌اش اینجا حرفی نمی‌زد: فرم
              خودش نشان می‌دهد با ایمیل است یا موبایل. */}
          <motion.h1
            variants={itemVariants}
            className="cursor-default text-3xl font-extrabold text-foreground"
          >
            ثبت‌نام
          </motion.h1>
          <motion.div
            variants={itemVariants}
            className=" flex items-center justify-center w-full"
          >
            <SignUp
              setIsLogin={setIsLogin}
              onSuccess={handleSuccess}
              googleEnabled={googleEnabled}
              returnTo={returnTo}
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="login"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          dir="rtl"
          className="mx-auto mt-10 flex flex-col items-center justify-center"
        >
          <motion.h1
            variants={itemVariants}
            className="cursor-default text-3xl font-extrabold text-foreground"
          >
            ورود
          </motion.h1>
          <motion.div
            variants={itemVariants}
            className=" flex items-center justify-center w-full"
          >
            <LoginForm
              setIsLogin={setIsLogin}
              onSuccess={handleSuccess}
              googleEnabled={googleEnabled}
              returnTo={returnTo}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Auth;
