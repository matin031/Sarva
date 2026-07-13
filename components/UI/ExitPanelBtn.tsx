"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

function ExitPanelBtn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    await router.push("/");
    toast.success("با موفقیت خارج شدید", {
      className: "glass-toast ",
    });
    setLoading(false);
  };
  return (
    <div className="w-full flex items-center justify-center">
      <button
        onClick={handleLogout}
        className={`bg-red-600 text-white rounded-lg px-5 py-1 mt-10 ${loading && "brightness-50 cursor-not-allowed"}`}
      >
        خروج از حساب کاربری
      </button>
    </div>
  );
}

export default ExitPanelBtn;
