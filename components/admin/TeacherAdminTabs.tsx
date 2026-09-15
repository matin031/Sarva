"use client";

import { useState } from "react";
import TeacherRequestsPanel from "@/components/admin/TeacherRequestsPanel";
import VerifiedTeachersPanel from "@/components/admin/VerifiedTeachersPanel";
import type { AdminTeacherRequest } from "@/lib/teacher/types";

/**
 * دو نمای «مدیریت دبیران»، در یک صفحه.
 *
 * =============================================================================
 * ⚠️ چرا یک صفحهٔ دوم ساخته نشد
 * =============================================================================
 *
 * «درخواست‌ها» و «دبیران فعال» دو مرحله از *یک* چرخه‌اند و مدیر مدام بینشان
 * می‌رود: پرونده‌ای را تأیید می‌کند و می‌خواهد ببیند طرف واقعاً دبیر شد و
 * پلاسش آمد یا نه. دو مسیرِ جدا در نوارِ کناری یعنی همان رفت‌وبرگشت با دو
 * بارگذاریِ کاملِ صفحه، و یک ورودیِ تازه در منویی که همین حالا هم شانزده
 * قلم دارد.
 *
 * =============================================================================
 * ⚠️ چرا `aria-pressed` و نه `role="tab"`
 * =============================================================================
 *
 * قراردادِ `role="tablist"` فقط چند صفت نیست؛ با آن، صفحه‌خوان و کاربرِ
 * صفحه‌کلید انتظارِ roving tabindex و جابه‌جایی با کلیدهای جهت‌دار را
 * دارند، و تبی که آن‌ها را نداشته باشد از یک دکمهٔ ساده هم بدتر است — چون
 * قولی می‌دهد که عمل نمی‌کند.
 *
 * دو دکمهٔ دوحالته با `aria-pressed` همان معنا را بدونِ هیچ قولِ اضافه
 * می‌رسانند: کلیدِ Tab طبیعی بینشان حرکت می‌کند و صفحه‌خوان «فشرده» را
 * می‌گوید.
 */
export default function TeacherAdminTabs({
  initialRequests,
  initialTotal,
  initialPending,
}: {
  initialRequests: AdminTeacherRequest[];
  initialTotal: number;
  initialPending: number;
}) {
  const [tab, setTab] = useState<"requests" | "teachers">("requests");

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">مدیریت دبیران</h1>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          درخواست‌های دبیری
          {/* ⚠️ شمارِ در-انتظار روی خودِ دکمه می‌نشیند و نه فقط داخلِ تب:
              مدیری که تبِ «دبیران فعال» را باز گذاشته، وگرنه نمی‌فهمد صفی
              منتظرش است. */}
          {initialPending > 0 && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold-ink">
              {initialPending.toLocaleString("fa-IR")}
              {/* ⚠️ عددِ تنها روی دکمه برای چشم گویاست و برای صفحه‌خوان نه:
                  «درخواست‌های دبیری، سه» معنایی ندارد. این کلمه فقط شنیده
                  می‌شود. */}
              <span className="sr-only"> در انتظار بررسی</span>
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "teachers"} onClick={() => setTab("teachers")}>
          دبیران فعال
        </TabButton>
      </div>

      {/* ⚠️ نمای غیرفعال unmount می‌شود و با `hidden` پنهان نمی‌ماند: هر دو
          نما جست‌وجو و صفحه‌بندیِ خودشان را دارند و نگه داشتنِ هر دو یعنی
          دو حالتِ زندهٔ هم‌زمان که هیچ‌کدام روی صفحه نیست. بازگشت به تبِ
          درخواست‌ها هم ارزان است — دادهٔ اولیه‌اش از سرور آمده. */}
      {tab === "requests" ? (
        <TeacherRequestsPanel
          initialRequests={initialRequests}
          initialTotal={initialTotal}
          initialPending={initialPending}
        />
      ) : (
        <VerifiedTeachersPanel />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
