"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Where the reset link lands. supabase.auth.resetPasswordForEmail sent the
// user here with a recovery token in the URL; the browser client (with
// detectSessionInUrl) exchanges it for a short-lived recovery session on
// load, after which updateUser({ password }) is allowed.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        settled = true;
        setReady("ok");
      } else if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setReady("ok");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setReady("ok");
      }
    });
    // if nothing established a session shortly after load, the link is
    // missing/expired
    const t = setTimeout(() => {
      if (!settled) setReady("invalid");
    }, 2500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("تغییر رمز با خطا مواجه شد. لینک را دوباره درخواست کن.");
      return;
    }
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

        {ready === "checking" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">در حال بررسی لینک…</p>
        )}

        {ready === "invalid" && (
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

        {ready === "ok" &&
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
              {error && <p className="text-xs text-red-500 sm:text-sm">{error}</p>}
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
