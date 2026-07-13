"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

function RegisterPrompt() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (user) return null;

  return (
    <div className="mt-6 flex flex-col items-center">
      <p className="text-muted-foreground">
        برای پاسخ به پرسش‌های بیشتر در سایت ثبت نام کنید
      </p>
      <Link
        className="active:scale-95 px-4 py-1 rounded-lg transition-all glass hover:bg-accent/70! mt-3"
        href="/auth"
      >
        ورود به سایت
      </Link>
    </div>
  );
}

export default RegisterPrompt;
