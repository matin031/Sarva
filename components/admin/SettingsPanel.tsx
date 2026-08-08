"use client";

import { useState, useTransition } from "react";
import { useAdminToast } from "./AdminToast";
import {
  adminResetSetting,
  adminSendTestEmail,
  adminSetSetting,
  type AdminSetting,
} from "@/lib/admin/settings-actions";
import type { SettingKey } from "@/lib/settings";

const SOURCE_LABEL: Record<AdminSetting["source"], string> = {
  db: "ذخیره‌شده در پنل",
  env: "از فایل تنظیمات سرور",
  none: "تنظیم نشده",
};

export default function SettingsPanel({
  settings,
  adapters,
}: {
  settings: AdminSetting[];
  adapters: { mail: string; sms: string; storage: string };
}) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value ?? ""])),
  );
  const [testTo, setTestTo] = useState("");

  const save = (key: SettingKey) => {
    startTransition(async () => {
      const result = await adminSetSetting(key, drafts[key] ?? "");
      if (result.ok) toast("ذخیره شد.", "success");
      else toast(result.errors.join("\n"));
    });
  };

  const reset = (key: SettingKey) => {
    startTransition(async () => {
      const result = await adminResetSetting(key);
      if (result.ok) toast("به مقدار سرور برگشت.", "success");
      else toast(result.errors.join("\n"));
    });
  };

  const sendTest = () => {
    startTransition(async () => {
      const result = await adminSendTestEmail(testTo);
      if (result.ok) toast("ایمیل آزمایشی ارسال شد.", "success");
      else toast(result.errors.join("\n"));
    });
  };

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-8 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-sm text-muted-foreground">
          مقادیری که بدون نیاز به انتشار دوبارهٔ سایت قابل تغییرند.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {settings.map((setting) => (
          <div
            key={setting.key}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{setting.label}</h3>
              <span
                className={`rounded-lg px-2 py-0.5 text-[11px] ${
                  setting.source === "db"
                    ? "bg-primary/15 text-primary"
                    : setting.source === "env"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {SOURCE_LABEL[setting.source]}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">{setting.description}</p>

            <input
              dir="ltr"
              value={drafts[setting.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
              placeholder="سروا <noreply@example.com>"
              className="min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => save(setting.key)}
                className="min-h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                ذخیره
              </button>
              {setting.source === "db" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => reset(setting.key)}
                  className="min-h-9 rounded-xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  برگشت به مقدار سرور
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* یک تنظیم ایمیلِ اشتباه تا وقتی کسی ثبت‌نام نکند خودش را نشان نمی‌دهد؛
          این دکمه آن حلقهٔ بازخورد را به چند ثانیه کوتاه می‌کند. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">ارسال ایمیل آزمایشی</h3>
        <p className="text-sm text-muted-foreground">
          برای اطمینان از درست بودن تنظیمات، یک ایمیل آزمایشی بفرستید.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            dir="ltr"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="min-h-10 min-w-56 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={pending || !testTo.trim()}
            onClick={sendTest}
            className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            ارسال
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">سرویس‌های فعال</h2>
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-3">
          {[
            { label: "ایمیل", value: adapters.mail, env: "MAIL_DRIVER" },
            { label: "پیامک", value: adapters.sms, env: "SMS_DRIVER" },
            { label: "ذخیرهٔ فایل", value: adapters.storage, env: "STORAGE_DRIVER" },
          ].map((a) => (
            <div key={a.env} className="rounded-2xl border border-border bg-card p-4">
              <span className="block text-xs text-muted-foreground">{a.label}</span>
              <span className="mt-1 block font-mono text-sm font-semibold">{a.value}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                با {a.env} در .env عوض می‌شود
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
