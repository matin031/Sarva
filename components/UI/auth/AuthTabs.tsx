"use client";

/**
 * نوارِ دو تبِ «موبایل / ایمیل».
 *
 * ⚠️ یک کامپوننت و نه دو کپی. تا دیروز این نوار فقط در فرمِ *ورود* بود و
 * ثبت‌نام اصلاً تبی نداشت؛ اولین کاری که برای دو-تبه کردنِ ثبت‌نام به ذهن
 * می‌رسد کپی کردنِ همان بیست خط است. دو کپی یعنی از اولین تغییرِ بعدی
 * (عرضِ نشانگر، رنگِ تبِ فعال، ترتیبِ تب‌ها) دو صفحهٔ متفاوت داریم که
 * کاربر بینشان جابه‌جا می‌شود.
 *
 * ⚠️ ترتیب: موبایل **راست**، ایمیل چپ — و نشانگر در حالتِ «موبایل» جابه‌جا
 * نمی‌شود (`translate-x-0`). در چیدمانِ راست‌به‌راست، تبِ اول از راست
 * شروع می‌شود و همین است که نشانگر را با تبِ درست هم‌راستا نگه می‌دارد.
 */
export type AuthTab = "mobile" | "email";

export default function AuthTabs({
  value,
  onChange,
  /** برچسبِ هر تب فرق می‌کند: «ورود با …» در برابر «ثبت‌نام با …». */
  labels = { mobile: "موبایل", email: "ایمیل" },
}: {
  value: AuthTab;
  onChange: (tab: AuthTab) => void;
  labels?: Record<AuthTab, string>;
}) {
  return (
    <div
      dir="rtl"
      role="tablist"
      aria-label="راه ورود"
      className="relative grid grid-cols-2 items-center gap-x-4 rounded-xl border border-primary/40 bg-primary/10 px-2 py-2 text-center"
    >
      <span
        aria-hidden
        className={`absolute top-1 right-1 h-[calc(100%-8px)] w-[calc(50%-8px)] rounded-xl bg-primary transition-transform duration-500 ease-in-out ${
          value === "mobile" ? "translate-x-0" : "-translate-x-[calc(100%+8px)]"
        }`}
      />
      {(["mobile", "email"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          onClick={() => onChange(tab)}
          className={`relative z-10 cursor-pointer rounded-xl py-2 transition-colors duration-300 ${
            value === tab ? "text-white dark:text-black" : "text-foreground"
          }`}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}
