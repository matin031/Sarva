"use client";

import { useRef, useState } from "react";
import { Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import { Field, Input } from "@/components/UI/kit/field";
import { apiPost, errorText } from "@/lib/api/client";
import { formatPhone, isValidPhone } from "@/lib/auth/phone";
import { refreshCurrentUser, useCurrentUser } from "@/lib/auth/use-current-user";
import styles from "./panel-design.module.css";

/**
 * تأیید شمارهٔ موبایل از داخلِ حساب.
 *
 * ⚠️ بند ۵ این را لازم می‌کند: کاربری که با ایمیل ثبت‌نام کرده و می‌خواهد
 * درخواستِ دبیری بدهد، باید اول شماره‌اش را وارد و تأیید کند. تا امروز هیچ
 * راهی برای این کار در سایت نبود — ورود با پیامک وجود داشت، ولی *افزودنِ*
 * شماره به حسابی که با ایمیل ساخته شده، نه.
 *
 * ⚠️ همان شکلِ `EmailVerification` را دارد و عمدی است: هر دو یک کار
 * می‌کنند («یک راهِ ارتباطی را تأیید کن») و کنارِ هم در همان صفحه‌اند.
 * دو طراحیِ متفاوت برای دو کارِ یکسان، فقط کاربر را مکث می‌دهد.
 */

const CODE_LENGTH = 6;
const EMPTY_CODE = Array.from({ length: CODE_LENGTH }, () => "");

export default function PhoneVerification() {
  const { user, loading } = useCurrentUser();

  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
            <p className="truncate text-sm text-muted-foreground" dir="ltr">
              {formatPhone(user.phone)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sendCode = async () => {
    // ⚠️ اعتبارسنجیِ سمتِ کلاینت پیش از فرستادن — هر درخواستی که به سرور
    // برسد و شماره‌اش غلط باشد، یک سهمیه از سقفِ نرخ می‌سوزاند (و آن سقف
    // برای یک کاربر فقط سه بار در ساعت است).
    if (!isValidPhone(phone)) {
      setError("شمارهٔ موبایل معتبر نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ بنویس.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await apiPost<{ sent: boolean; alreadyVerified?: boolean; phoneMasked: string | null }>(
      "/api/v1/auth/phone/send-code",
      { phone },
    );
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
    setMessage("کد شش‌رقمی پیامک شد.");
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const onDigit = (index: number, value: string) => {
    // فقط آخرین رقمِ واردشده — تا paste یا تایپِ سریع خانه را خراب نکند.
    const digit = value.replace(/[^0-9۰-۹٠-٩]/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const verify = async () => {
    const value = code.join("");
    if (value.length !== CODE_LENGTH) {
      setError("کد ۶ رقمی را کامل وارد کن.");
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
      inputRefs.current[0]?.focus();
      return;
    }

    // ⚠️ بخشِ «فعال‌سازی حساب دبیر» به `phoneVerified` نگاه می‌کند و باید
    // همین حالا از حالتِ «اول شماره‌ات را تأیید کن» بیرون بیاید.
    refreshCurrentUser();
    setMessage("شماره‌ات تأیید شد.");
  };

  return (
    <Card data-tone="gold">
      <div className={styles.formIntro}>
        <span className={styles.sticker}>
          <Phone aria-hidden className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold">شمارهٔ موبایلت را تأیید کن</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            برای درخواست حساب دبیری لازم است، و اگر رمزت را فراموش کردی راهِ برگشت می‌شود.
          </p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4">
        <Field label="شمارهٔ موبایل" htmlFor="phone-input">
          <Input
            id="phone-input"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-left placeholder:text-center"
          />
        </Field>

        {sentTo && (
          <>
            <p className="text-xs text-muted-foreground">
              کد به <span dir="ltr">{sentTo}</span> فرستاده شد.
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
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[i] && i > 0) {
                      inputRefs.current[i - 1]?.focus();
                    }
                  }}
                  aria-label={`رقم ${i + 1} از کد تأیید`}
                  className="size-11 rounded-xl border-2 border-border bg-background text-center text-lg font-bold outline-none transition-colors focus:border-primary"
                />
              ))}
            </div>
          </>
        )}

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {sentTo && (
            <Button type="button" disabled={busy} onClick={() => void verify()}>
              {busy ? "در حال بررسی…" : "تأیید کد"}
            </Button>
          )}
          <Button
            type="button"
            variant={sentTo ? "outline" : "default"}
            disabled={busy}
            onClick={() => void sendCode()}
          >
            {busy && !sentTo ? "در حال ارسال…" : sentTo ? "ارسال دوبارهٔ کد" : "ارسال کد"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
