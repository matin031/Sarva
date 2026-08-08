"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";

/**
 * جایی که لینک بازنشانی رمز فرود می‌آید.
 *
 * قبلاً این صفحه به یک سشنِ موقتِ GoTrue تکیه می‌کرد: کتابخانهٔ Supabase توکنِ
 * داخل URL را می‌گرفت، با آن یک سشن recovery می‌ساخت، و صفحه با گوش دادن به
 * onAuthStateChange می‌فهمید که مجاز است. یعنی لینکِ ایمیل عملاً یک ورودِ
 * کامل بود، و صفحه یک تایمر ۲.۵ ثانیه‌ای داشت تا حدس بزند لینک معتبر است یا نه.
 *
 * حالا توکن فقط یک رشته در query string است که تنها یک کار می‌تواند بکند:
 * تغییر رمز. هیچ سشنی پیش از ست شدن رمز تازه صادر نمی‌شود، و اعتبارش را سرور
 * در همان درخواست تعیین می‌کند — نه یک تایمر.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // از window خوانده می‌شود و نه با useSearchParams: آن هوک این صفحه را وادار
  // به داشتن مرز Suspense می‌کند و از حالت ایستا بیرونش می‌آورد، در حالی که
  // اینجا فقط یک رشته لازم داریم.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    setToken(value && value.length >= 10 ? value : null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || password.length > 16) {
      setError("رمز عبور باید بین ۸ تا ۱۶ کاراکتر باشد");
      return;
    }
    if (password !== confirm) {
      setError("رمز عبور و تکرار آن یکسان نیست");
      return;
    }

    setLoading(true);
    const result = await apiPost("/api/v1/auth/reset-password", { token, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }

    // سرور در همین پاسخ سشن تازه داده؛ کش کاربر باید تازه شود وگرنه هدر
    // همچنان مهمان نشان می‌دهد.
    refreshCurrentUser();
    setDone(true);
    setTimeout(() => {
      router.push("/panel");
      router.refresh();
    }, 1500);
  };

  return (
    <main dir="rtl" className="container flex justify-center">
      <div className="glass relative z-20 mt-16 w-[95%] max-w-md rounded-2xl p-6 sm:p-8">
        <h1 className="text-center text-2xl font-extrabold">رمز عبور جدید</h1>

        {token === undefined && (
          <p className="mt-6 text-center text-sm text-muted-foreground">در حال بررسی لینک…</p>
        )}

        {token === null && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              این لینک نامعتبر یا منقضی شده است. لطفاً از صفحهٔ ورود دوباره درخواست بازیابی رمز کن.
            </p>
            <button
              onClick={() => router.push("/auth")}
              className="mt-5 min-h-11 w-full rounded-xl bg-primary font-bold text-black"
            >
              بازگشت به ورود
            </button>
          </div>
        )}

        {token &&
          (done ? (
            <p className="mt-6 text-center text-sm text-primary">
              رمز عبورت با موفقیت تغییر کرد. در حال انتقال به پنل…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-sm text-muted-foreground">رمز عبور جدید</label>
                <div className="mt-1 flex flex-row-reverse items-center rounded-xl border border-muted-foreground/10 px-4 py-3 focus-within:border-primary">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="*************"
                    className="w-full text-left outline-none placeholder:text-right placeholder:text-muted-foreground/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="text-muted-foreground"
                    aria-label="نمایش رمز"
                  >
                    {show ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">تکرار رمز عبور</label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="*************"
                  className="mt-1 w-full rounded-xl border border-muted-foreground/10 px-4 py-3 text-left outline-none placeholder:text-right placeholder:text-muted-foreground/30 focus:border-primary"
                />
              </div>
              {error && <p className="text-xs whitespace-pre-line text-red-500 sm:text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full rounded-xl bg-primary font-bold text-black disabled:opacity-60"
              >
                {loading ? "در حال ذخیره…" : "ذخیرهٔ رمز جدید"}
              </button>
            </form>
          ))}
      </div>
    </main>
  );
}
