"use client";

import Link from "next/link";
import { toFa } from "@/components/UI/CircularProgress";

interface GuestLimitModalProps {
  questionLimit: number;
  onContinue: () => void;
}

function GuestLimitModal({ questionLimit, onContinue }: GuestLimitModalProps) {
  return (
    <div
      dir="rtl"
      className=" fixed h-screen  w-screen inset-0 
      backdrop-blur-sm z-30 flex items-center justify-center"
    >
      <div
        className=" sm:w-full max-w-md glass relative z-100 gap-y-6 rounded-xl
       flex flex-col items-center p-4 sm:p-6 text-center w-[90%]"
      >
        <div
          className=" size-12 rounded-full bg-primary/20 text-primary 
        flex items-center justify-center"
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
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <h3 className=" text-lg font-bold">وارد حساب کاربری خود نشده‌اید</h3>

        <p className=" text-muted-foreground text-sm sm:text-base">
          در حالت مهمان فقط {questionLimit} سوال برای شما قابل دسترسی است. برای
          دسترسی به همه‌ی سوالات و ذخیرۀ پیشرفتتان وارد حساب کاربری خود شوید.
        </p>

        <div className=" w-full flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/auth"
            className=" w-full font-bold bg-primary py-2 text-center rounded-xl 
            brightness-90 hover:brightness-100 transition-all text-white"
          >
            ورود / ثبت‌نام
          </Link>
          <button
            onClick={onContinue}
            className=" w-full font-medium bg-muted py-2 text-center rounded-xl 
            brightness-90 hover:brightness-100 active:scale-95 transition-all"
          >
            ادامه با {toFa(questionLimit)} سوال
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuestLimitModal;
