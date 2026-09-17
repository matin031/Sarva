"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { apiPost, errorText } from "@/lib/api/client";
import { formatPhone, isValidPhone } from "@/lib/auth/phone";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import { fa } from "@/lib/panel/format";
import styles from "./panel-design.module.css";

/**
 * تأیید شمارهٔ موبایل از داخلِ حساب.
 *
 * ⚠️ بند ۵ این را لازم می‌کند: کاربری که با ایمیل ثبت‌نام کرده و می‌خواهد
 * درخواستِ دبیری بدهد، باید اول شماره‌اش را وارد و تأیید کند.
 *
 * ⚠️ همان شکلِ `EmailVerification` را دارد و عمدی است: هر دو یک کار
 * می‌کنند («یک راهِ ارتباطی را تأیید کن») و کنارِ هم در همان صفحه‌اند.
 *
 * ── چهار چیزی که اینجا درست شد ─────────────────────────────────────────────
 *
 * ۱. **عرضِ ورودی.** یک `Input`ِ `w-full` در کارتی که تا ۱۴۰۰ پیکسل پهن
 *    می‌شود، برای یازده رقم. ورودی باید به‌اندازهٔ چیزی باشد که در آن
 *    نوشته می‌شود — عرضِ ناهماهنگ، به کاربر می‌گوید «شاید بیشتر بنویس».
 *    حالا سقفِ عرض دارد و دکمهٔ «ارسال کد» کنارش می‌نشیند، نه زیرش.
 *
 * ۲. **چسباندنِ کد (paste).** کاربر کدِ شش‌رقمی را از پیامک کپی می‌کند و در
 *    خانهٔ اول می‌چسباند. `onChange` مقدارِ «۱۲۳۴۵۶» می‌گرفت و
 *    `slice(-1)` فقط «۶» را نگه می‌داشت — یعنی رایج‌ترین کاری که کاربر
 *    می‌کند، کار نمی‌کرد. `onPaste` حالا کلِ رشته را پخش می‌کند.
 *
 * ۳. **شماره پس از ارسالِ کد قفل می‌شود.** پیش از این ویرایش‌پذیر می‌ماند:
 *    کاربر می‌توانست رقمی از شماره را عوض کند و بعد «تأیید» بزند — و کدِ
 *    شمارهٔ *قبلی* برای شمارهٔ *تازه* فرستاده می‌شد. نتیجه همیشه «کد
 *    نادرست است» بود، بدونِ هیچ سرنخی از علت.
 *
 * ۴. **مهلتِ ارسالِ دوباره.** سقفِ سرور سه پیامک در ساعت است. دکمه‌ای که
 *    بی‌وقفه قابلِ فشردن باشد، همان سقف را در چند ثانیه می‌سوزاند و کاربر
 *    یک ساعت بیرون می‌ماند.
 */

const CODE_LENGTH = 6;
const EMPTY_CODE = Array.from({ length: CODE_LENGTH }, () => "");
const RESEND_SECONDS = 60;

/** ارقامِ فارسی و عربی → لاتین. سرور هم همین کار را می‌کند، ولی خانه‌های کد
 *  باید *همان لحظه* رقمِ آشنا نشان بدهند. */
const toLatin = (raw: string) =>
  raw.replace(/[۰-۹٠-٩]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });

export default function PhoneVerification() {
  const { user, loading } = useCurrentUser();

  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* شمارشِ معکوسِ «ارسال دوباره». یک بازه برای کلِ کامپوننت، و با
     unmount پاک می‌شود — نه یک setTimeout سرگردان به‌ازای هر ارسال. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (loading || !user) return null;

  /* ── تأییدشده: یک نوارِ آرام و نه یک فرم ─────────────────────────────── */
  if (user.phoneVerified && user.phone) {
    return (
      <Card data-tone="mint">
        <CardContent className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">شمارهٔ موبایلت تأیید شده</h3>
            <p className="panel-num truncate text-sm text-muted-foreground" dir="ltr">
              {formatPhone(user.phone)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const focusBox = (index: number) => {
    requestAnimationFrame(() => inputRefs.current[index]?.focus());
  };

  const sendCode = async () => {
    // ⚠️ اعتبارسنجیِ سمتِ کلاینت پیش از فرستادن — هر درخواستی که به سرور
    // برسد و شماره‌اش غلط باشد، یک سهمیه از سقفِ نرخ می‌سوزاند (و آن سقف
    // برای یک کاربر فقط سه بار در ساعت است).
    if (!isValidPhone(phone)) {
      setError("شمارهٔ موبایل درست نیست. یازده رقم، مثل ۰۹۱۲۳۴۵۶۷۸۹.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await apiPost<{
      sent: boolean;
      alreadyVerified?: boolean;
      phoneMasked: string | null;
    }>("/api/v1/auth/phone/send-code", { phone });
    setBusy(false);

    if (!result.ok) {
      setError(errorText(result));
      return;
    }

    if (result.data.alreadyVerified) {
      refreshCurrentUser();
      return;
    }

    setSentTo(result.data.phoneMasked);
    setCode(EMPTY_CODE);
    setCooldown(RESEND_SECONDS);
    setMessage("کد شش‌رقمی برایت پیامک شد.");
    focusBox(0);
  };

  const onDigit = (index: number, value: string) => {
    // فقط آخرین رقمِ واردشده — تا تایپِ سریع خانه را خراب نکند.
    const digit = toLatin(value).replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  /** چسباندنِ کلِ کد در هر خانه‌ای — رقم‌ها از همان خانه به بعد پخش می‌شوند. */
  const onPaste = (index: number, event: React.ClipboardEvent) => {
    const digits = toLatin(event.clipboardData.getData("text")).replace(/\D/g, "");
    if (!digits) return;
    event.preventDefault();

    const next = [...code];
    for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = digits[i];
    }
    setCode(next);
    focusBox(Math.min(index + digits.length, CODE_LENGTH - 1));
  };

  const onBoxKey = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }
    // خانه‌ها `dir="ltr"` اند، پس چپ یعنی عقب.
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const verify = async () => {
    const value = code.join("");
    if (value.length !== CODE_LENGTH) {
      setError("هر شش خانهٔ کد را پر کن.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await apiPost("/api/v1/auth/phone/verify", { phone, code: value });
    setBusy(false);

    if (!result.ok) {
      setError(errorText(result));
      setCode(EMPTY_CODE);
      focusBox(0);
      return;
    }

    // ⚠️ بخشِ «فعال‌سازی حساب دبیر» به `phoneVerified` نگاه می‌کند و باید
    // همین حالا از حالتِ «اول شماره‌ات را تأیید کن» بیرون بیاید.
    refreshCurrentUser();
    setMessage("شماره‌ات تأیید شد.");
  };

  /** بازگشت به مرحلهٔ اول، برای وقتی شماره را اشتباه زده. */
  const editPhone = () => {
    setSentTo(null);
    setCode(EMPTY_CODE);
    setError(null);
    setMessage(null);
  };

  const codeComplete = code.every(Boolean);

  return (
    <Card data-tone="gold">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <Phone aria-hidden className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold">تأیید شمارهٔ موبایل</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            برای درخواست حساب دبیری لازم است، و اگر رمزت را فراموش کردی راهِ
            برگشت می‌شود.
          </p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4">
        {/* ⚠️ `max-w-64` و نه `w-full`: یک شمارهٔ یازده‌رقمی در ۲۵۶ پیکسل جا
            می‌شود و دکمه کنارش می‌ماند. روی موبایل `flex-wrap` دکمه را
            می‌برد سطرِ بعد. */}
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="شمارهٔ موبایل"
            htmlFor="phone-input"
            className="w-full max-w-64"
          >
            <Input
              id="phone-input"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              maxLength={13}
              placeholder="09123456789"
              value={phone}
              readOnly={!!sentTo}
              aria-invalid={!!error && !sentTo}
              onChange={(e) => setPhone(e.target.value)}
              className="panel-num text-left tracking-[0.08em] placeholder:tracking-normal"
            />
          </Field>

          {sentTo ? (
            <Button type="button" variant="soft" onClick={editPhone}>
              <Pencil aria-hidden />
              تغییر شماره
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void sendCode()}>
              {busy ? "در حال ارسال…" : "ارسال کد"}
            </Button>
          )}
        </div>

        {sentTo && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-foreground/[0.02] p-4">
            <p className="text-xs text-muted-foreground">
              کد به <span dir="ltr" className="panel-num">{sentTo}</span> فرستاده شد.
            </p>

            <div className="flex justify-center gap-2" dir="ltr">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  /* ⚠️ فقط روی خانهٔ اول: با این، اندروید و iOS کدِ پیامک را
                     خودشان پیشنهاد می‌دهند. روی هر شش خانه یعنی شش پیشنهادِ
                     هم‌زمان. */
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onPaste={(e) => onPaste(i, e)}
                  onKeyDown={(e) => onBoxKey(i, e)}
                  onFocus={(e) => e.target.select()}
                  aria-label={`رقم ${i + 1} از کد تأیید`}
                  className="panel-num size-11 rounded-xl border-2 border-border bg-background text-center text-lg font-bold outline-none transition-colors focus:border-primary"
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                disabled={busy || !codeComplete}
                onClick={() => void verify()}
              >
                {busy ? "در حال بررسی…" : "تأیید کد"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || cooldown > 0}
                onClick={() => void sendCode()}
              >
                {cooldown > 0
                  ? `ارسال دوباره تا ${fa(cooldown)} ثانیه`
                  : "ارسال دوبارهٔ کد"}
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
