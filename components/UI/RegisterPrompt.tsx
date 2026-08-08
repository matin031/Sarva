"use client";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/use-current-user";

function RegisterPrompt() {
  const { user, loading } = useCurrentUser();

  // تا وقتی نمی‌دانیم کاربر کیست چیزی نشان نمی‌دهیم. نسخهٔ قبلی این حالت را
  // نداشت و دعوت به ثبت‌نام برای کاربرِ واردشده هم یک لحظه ظاهر می‌شد و بعد
  // ناپدید.
  if (loading || user) return null;

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
