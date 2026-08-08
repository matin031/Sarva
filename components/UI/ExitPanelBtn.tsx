"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { apiPost } from "@/lib/api/client";
import { clearCurrentUser } from "@/lib/auth/use-current-user";

function ExitPanelBtn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);

    // سرور ردیف سشن را باطل و کوکی‌ها را پاک می‌کند. حتی اگر شکست بخورد،
    // کاربر باید از دید خودش خارج شود — endpoint هم به همین دلیل همیشه موفق
    // برمی‌گردد.
    await apiPost("/api/v1/auth/logout");

    // کش هوکِ کاربر پاک می‌شود تا هدر بلافاصله حالت مهمان را نشان بدهد و نه
    // بعد از رفرش بعدی.
    clearCurrentUser();

    router.push("/");
    // بدون این، صفحه‌های سروری که قبلاً با کاربرِ واردشده رندر شده‌اند از کش
    // مسیریاب برمی‌گردند و کاربر همچنان وارد به نظر می‌رسد.
    router.refresh();

    toast.success("با موفقیت خارج شدید", {
      className: "glass-toast ",
    });
    setLoading(false);
  };

  return (
    <div className="w-full flex items-center justify-center">
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`bg-red-600 text-white rounded-lg px-5 py-1 mt-10 ${loading && "brightness-50 cursor-not-allowed"}`}
      >
        خروج از حساب کاربری
      </button>
    </div>
  );
}

export default ExitPanelBtn;
