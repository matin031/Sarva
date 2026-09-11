"use client";

import { useState, useTransition } from "react";
import { useAdminToast } from "./AdminToast";
import ConfirmDialog from "./ConfirmDialog";
import { adminSetSetting } from "@/lib/admin/settings-actions";

/**
 * کلیدِ روشن/خاموشِ سروا پلاس.
 *
 * ⚠️ چرا این کامپوننت ساخته شد، وقتی همان تنظیم از قبل در صفحهٔ «تنظیمات»
 * وجود داشت:
 *
 * وجود داشتن با *پیدا شدن* یکی نیست. آن تنظیم یک `<select>` بود در میانِ
 * فهرستی از ورودی‌های متنیِ ایمیل و پیامک، و صفحهٔ «سروا پلاس» — یعنی جایی
 * که هر کسی برای روشن کردنِ پلاس اول به آن سر می‌زند — فقط یک لینک داشت که
 * می‌گفت «تغییر در تنظیمات». نتیجه این بود که مالک بارها دنبالش گشت و پیدا
 * نکرد.
 *
 * درسِ درست از این ماجرا این نیست که «کاربر بلد نبود»؛ این است که مهم‌ترین
 * کلیدِ سایت نباید در فهرستی از تنظیماتِ کم‌اهمیت‌تر پنهان شود. حالا همان
 * تنظیم دو جا دیده می‌شود و هر دو یک چیز را می‌نویسند (`plus.enabled`):
 * اینجا به‌شکلِ یک کلیدِ صریح، و در «تنظیمات» کنارِ بقیه برای کسی که آنجا
 * دنبالش می‌گردد.
 *
 * ⚠️ و هیچ منطقِ تازه‌ای اینجا نیست: همان `adminSetSetting` صدا زده می‌شود که
 * صفحهٔ تنظیمات هم صدا می‌زند — با همان `requireAdmin`، همان اعتبارسنجیِ
 * گزینه‌ها و همان ثبت در «فعالیت و خطاها». دو رابط، یک مسیر.
 */
export default function PlusPowerSwitch({ enabled }: { enabled: boolean }) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [confirmingOff, setConfirmingOff] = useState(false);

  const apply = (next: boolean) => {
    startTransition(async () => {
      const result = await adminSetSetting("plus.enabled", next ? "on" : "off");
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast(
        next
          ? "سروا پلاس روشن شد. تا یک دقیقه طول می‌کشد تا همهٔ صفحه‌ها ببینندش."
          : "سروا پلاس خاموش شد. دسترسی‌های ثبت‌شده پاک نشده‌اند.",
        "success",
      );
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border p-4 ${
        enabled ? "border-primary/40 bg-primary/5" : "border-gold/40 bg-gold/5"
      }`}
    >
      <div className="min-w-48 flex-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-2.5 rounded-full ${enabled ? "bg-primary" : "bg-gold"}`}
          />
          <h2 className="font-bold">
            {enabled ? "سروا پلاس روشن است" : "سروا پلاس خاموش است"}
          </h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {enabled
            ? "صفحهٔ خرید باز است، قابلیت‌های پولی قفل‌اند و نشان پلاس در هدر دیده می‌شود."
            : "سایت دقیقاً مثل قبل از پولی‌شدن کار می‌کند: هیچ صفحهٔ خریدی نیست و هیچ قابلیتی قفل نیست. اشتراک‌های ثبت‌شده پاک نمی‌شوند."}
        </p>
      </div>

      {/* ⚠️ روشن کردن یک کلیک است و خاموش کردن یک تأیید می‌خواهد.
          نامتقارن بودنش عمدی است: خاموش کردن، صفحهٔ خرید را از دسترسِ همهٔ
          کاربران برمی‌دارد و روی سرورِ اصلی بلافاصله اثر می‌کند. */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="روشن یا خاموش کردن سروا پلاس"
        disabled={pending}
        onClick={() => (enabled ? setConfirmingOff(true) : apply(true))}
        className={`relative h-9 w-16 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
          enabled ? "border-primary bg-primary/25" : "border-border bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 size-7 rounded-full transition-all ${
            enabled ? "start-8 bg-primary" : "start-1 bg-muted-foreground/60"
          }`}
        />
      </button>

      <span className="text-xs font-bold text-muted-foreground">
        {pending ? "در حال ذخیره…" : enabled ? "روشن" : "خاموش"}
      </span>

      <ConfirmDialog
        open={confirmingOff}
        title="سروا پلاس خاموش شود؟"
        body="صفحهٔ خرید برداشته می‌شود و همهٔ قابلیت‌های پولی برای همه باز می‌شوند."
        consequence="اشتراک‌های ثبت‌شده پاک نمی‌شوند و با روشن کردن دوباره، همان‌طور که بودند برمی‌گردند."
        confirmLabel="خاموش کن"
        onCancel={() => setConfirmingOff(false)}
        onConfirm={() => {
          setConfirmingOff(false);
          apply(false);
        }}
      />
    </div>
  );
}
