"use client";

import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { apiPatch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import type { NotifyPreferences } from "@/lib/notify/preferences";

/**
 * «پیامک و ایمیل بگیرم یا نه».
 *
 * ⚠️ بدونِ دکمهٔ «ذخیره». هر کلید مستقل است و بلافاصله ذخیره می‌شود؛ یک
 * فرمِ دو‌کلیدی که دکمهٔ ذخیره بخواهد، یعنی کاربری که کلید را زده و رفته،
 * فکر می‌کند خاموشش کرده و نکرده.
 *
 * ⚠️ و به‌روزرسانیِ خوش‌بینانه: کلید همان لحظه جابه‌جا می‌شود و اگر ذخیره
 * شکست بخورد، برمی‌گردد سر جایش و پیام می‌دهد. تأخیرِ نیم‌ثانیه‌ای روی یک
 * کلید، حسِ خرابی می‌دهد حتی وقتی همه‌چیز درست کار می‌کند.
 */

type Channel = keyof NotifyPreferences;

const ROWS: { key: Channel; label: string; hint: string; Icon: typeof Mail }[] = [
  {
    key: "sms",
    label: "پیامک",
    hint: "فقط به شمارهٔ تأییدشده فرستاده می‌شود.",
    Icon: MessageSquare,
  },
  {
    key: "email",
    label: "ایمیل",
    hint: "به آدرسی که در حسابت ثبت است.",
    Icon: Mail,
  },
];

export default function NotificationPreferences({ initial }: { initial: NotifyPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Channel | null>(null);

  async function toggle(key: Channel) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setError(null);
    setSaving(key);

    const result = await apiPatch<NotifyPreferences>("/api/v1/notifications/preferences", next);
    setSaving(null);

    if (!result.ok) {
      setPrefs(prefs);
      setError(result.errors.join(" "));
    }
  }

  return (
    <Card data-tone="lilac">
      <CardHeader>
        <CardTitle>پیام‌های سروا</CardTitle>
        <CardDescription>
          {/* ⚠️ این جمله تزئینی نیست: بدونش، کاربری که هر دو را خاموش
              می‌کند فکر می‌کند دیگر کدِ ورود هم نمی‌گیرد. */}
          خبر فعال‌شدن و پایان اشتراک از این راه‌ها می‌آید. کد ورود و بازیابی رمز مستقل‌اند و
          همیشه فرستاده می‌شوند.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {ROWS.map(({ key, label, hint, Icon }) => {
          const on = prefs[key];
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={on}
              disabled={saving === key}
              onClick={() => toggle(key)}
              className="flex items-center gap-3 rounded-xl border border-border/70 p-3 text-right transition-colors hover:border-primary/40 disabled:opacity-60"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  on ? "bg-primary/15 text-primary" : "bg-foreground/6 text-muted-foreground",
                )}
              >
                <Icon className="size-4.5" strokeWidth={1.7} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>

              {/* کلیدِ ساده: یک ریل و یک قرص. */}
              <span
                aria-hidden
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  on ? "bg-primary" : "bg-foreground/15",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-background transition-[inset-inline-start]",
                    /* در راست‌به‌چپ، «روشن» یعنی قرص به سمتِ پایانِ ریل
                       (چپ) برود. با ویژگی‌های منطقی، همان `start` بزرگ‌تر. */
                    on ? "start-5.5" : "start-0.5",
                  )}
                />
              </span>
            </button>
          );
        })}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
