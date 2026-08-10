"use client";

import { useState, useTransition } from "react";
import { useAdminToast } from "./AdminToast";
import ConfirmDialog from "./ConfirmDialog";
import {
  adminResetSetting,
  adminSendTestEmail,
  adminSetSetting,
  type AdapterStatus,
  type AdminSetting,
} from "@/lib/admin/settings-actions";
import type { SettingKey } from "@/lib/settings";

const GROUP_META: Record<string, { title: string; description: string }> = {
  mail: {
    title: "ایمیل",
    description: "کد تأیید حساب و لینک بازیابی رمز از این آدرس فرستاده می‌شوند.",
  },
  sms: {
    title: "پیامک",
    description:
      "هنوز هیچ بخشی از سایت پیامک نمی‌فرستد. این تنظیمات برای وقتی است که پنل پیامک بخرید — با پر کردن آن‌ها، ورود با موبایل بدون هیچ تغییری در کد فعال می‌شود.",
  },
};

const SOURCE_LABEL: Record<AdminSetting["source"], string> = {
  db: "تنظیم‌شده از همین پنل",
  env: "از تنظیمات سرور",
  none: "هنوز تنظیم نشده",
};

export default function SettingsPanel({
  settings,
  adapters,
}: {
  settings: AdminSetting[];
  adapters: AdapterStatus;
}) {
  const toast = useAdminToast();
  const [pending, startTransition] = useTransition();

  // برای رازها مقدار اولیه خالی است — سرور اصلاً نفرستاده. جای خالی یعنی
  // «دست نزن»، نه «پاک کن».
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value ?? ""])),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [testTo, setTestTo] = useState("");
  const [resetting, setResetting] = useState<AdminSetting | null>(null);

  const save = (setting: AdminSetting) => {
    const value = drafts[setting.key] ?? "";
    if (!value.trim()) {
      toast("مقدار نمی‌تواند خالی باشد.");
      return;
    }
    startTransition(async () => {
      const result = await adminSetSetting(setting.key, value);
      if (!result.ok) {
        toast(result.errors.join("\n"));
        return;
      }
      toast("ذخیره شد.", "success");
      setSaved((s) => ({ ...s, [setting.key]: true }));
      // راز بعد از ذخیره از فرم پاک می‌شود تا روی صفحه نماند.
      if (setting.secret) setDrafts((d) => ({ ...d, [setting.key]: "" }));
    });
  };

  const doReset = (key: SettingKey) => {
    setResetting(null);
    startTransition(async () => {
      const result = await adminResetSetting(key);
      if (result.ok) toast("به مقدار سرور برگشت.", "success");
      else toast(result.errors.join("\n"));
    });
  };

  const sendTest = () => {
    startTransition(async () => {
      const result = await adminSendTestEmail(testTo);
      if (result.ok) toast("ایمیل آزمایشی ارسال شد. صندوق ورودی را بررسی کنید.", "success");
      else toast(result.errors.join("\n"));
    });
  };

  const groups = ["mail", "sms"] as const;

  return (
    <div dir="rtl" className="flex max-w-3xl flex-col gap-10 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مقادیری که می‌توانید همین‌جا عوض کنید، بدون اینکه کسی به کد سایت دست بزند. هر تغییر
          بلافاصله اثر می‌کند و در «فعالیت و خطاها» ثبت می‌شود.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">وضعیت سرویس‌ها</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <AdapterCard title="ایمیل" status={adapters.mail} />
          <AdapterCard title="پیامک" status={adapters.sms} />
          <AdapterCard title="ذخیرهٔ فایل" status={adapters.storage} />
        </div>
      </section>

      {groups.map((group) => {
        const groupSettings = settings.filter((s) => s.group === group);
        if (groupSettings.length === 0) return null;
        const meta = GROUP_META[group];

        return (
          <section key={group} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold">{meta.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            </div>

            <div className="flex flex-col gap-3">
              {groupSettings.map((setting) => (
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
                            : "bg-gold/15 text-gold"
                      }`}
                    >
                      {SOURCE_LABEL[setting.source]}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">{setting.description}</p>

                  {setting.options ? (
                    <select
                      value={drafts[setting.key] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="" disabled>
                        یکی را انتخاب کنید…
                      </option>
                      {setting.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      {setting.secret && setting.hasValue && !saved[setting.key] && (
                        <p className="flex items-center gap-1.5 text-xs text-primary">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="size-3.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                          </svg>
                          مقداری ثبت شده و پنهان است. برای تغییر، مقدار تازه را بنویسید.
                        </p>
                      )}
                      <input
                        type={setting.secret ? "password" : "text"}
                        dir={setting.secret || setting.key.startsWith("mail") ? "ltr" : "rtl"}
                        autoComplete={setting.secret ? "new-password" : "off"}
                        value={drafts[setting.key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                        placeholder={setting.placeholder ?? ""}
                        className="min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => save(setting)}
                      className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      ذخیره
                    </button>
                    {setting.source === "db" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setResetting(setting)}
                        className="min-h-10 rounded-xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        برگشت به مقدار سرور
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {group === "mail" && (
              /* یک تنظیم ایمیلِ اشتباه تا وقتی کسی ثبت‌نام نکند خودش را نشان
                 نمی‌دهد؛ این دکمه آن حلقهٔ بازخورد را به چند ثانیه کوتاه می‌کند. */
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold">ارسال ایمیل آزمایشی</h3>
                <p className="text-sm text-muted-foreground">
                  ایمیل خودتان را بنویسید تا مطمئن شوید تنظیمات درست کار می‌کند. اگر نرسید، دلیلش
                  در «فعالیت و خطاها» ثبت می‌شود.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    dir="ltr"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                    className="min-h-11 min-w-56 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    disabled={pending || !testTo.trim()}
                    onClick={sendTest}
                    className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    ارسال
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <ConfirmDialog
        open={resetting !== null}
        tone="primary"
        title="برگشت به مقدار سرور"
        body={`مقداری که برای «${resetting?.label ?? ""}» در پنل ذخیره کرده‌اید پاک می‌شود و سایت دوباره از تنظیمات سرور استفاده می‌کند.`}
        confirmLabel="برگردان"
        onConfirm={() => resetting && doReset(resetting.key)}
        onCancel={() => setResetting(null)}
      />
    </div>
  );
}

function AdapterCard({
  title,
  status,
}: {
  title: string;
  status: AdapterStatus["mail"];
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span
          className={`size-2 shrink-0 rounded-full ${status.healthy ? "bg-primary" : "bg-gold"}`}
          aria-label={status.healthy ? "فعال" : "نیازمند تنظیم"}
        />
      </div>
      <span className="font-semibold">{status.label}</span>
      <span className="text-[11px] leading-relaxed text-muted-foreground">{status.note}</span>
    </div>
  );
}
