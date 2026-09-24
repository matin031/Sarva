"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Confetti, type ConfettiRef } from "@/components/UI/kit/confetti";
import { ShinyButton } from "@/components/UI/kit/magic-shiny-button";
import MainLogo from "@/components/svgs/mainLogo";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import { paletteHexColors } from "@/lib/theme/palette";

/**
 * لحظهٔ فعال‌شدن: نشانِ سروا، پیام و کاغذرنگی.
 *
 * ⚠️ `celebrate` را سرور تعیین می‌کند (پرداخت همین حالا تأیید شده) و نه
 * این کامپوننت. کسی که یک هفته بعد همین صفحه را از تاریخچهٔ مرورگر باز
 * می‌کند، رسید را می‌بیند و نه جشن را.
 *
 * ⚠️ `refreshCurrentUser` تا نشانِ پلاس در هدر همین حالا ظاهر شود؛ وگرنه
 * کاربر تازه پول داده و هدر هنوز می‌گوید پلاس نداری.
 */
export default function PaymentCelebration({
  title,
  subtitle,
  celebrate,
  primary,
  children,
}: {
  title: string;
  subtitle: string;
  celebrate: boolean;
  primary: { href: string; label: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    refreshCurrentUser();
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = paletteHexColors(["#ffffff"]);
    const end = Date.now() + 1400;
    let frame = 0;

    const burst = () => {
      void confettiRef.current?.fire({
        particleCount: 3,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      void confettiRef.current?.fire({
        particleCount: 3,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) frame = requestAnimationFrame(burst);
    };

    // یک انفجارِ مرکزی و بعد دو توپِ کناری.
    const start = window.setTimeout(() => {
      void confettiRef.current?.fire({
        particleCount: 90,
        spread: 80,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.35 },
        colors,
      });
      burst();
    }, 250);

    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(frame);
    };
  }, [celebrate]);

  return (
    <>
      <Confetti
        ref={confettiRef}
        manualstart
        className="pointer-events-none fixed inset-0 z-[60] size-full"
      />

      <section className="glass relative overflow-hidden rounded-3xl px-6 pb-7 pt-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_35%,transparent),transparent_70%)]"
        />

        <div className="relative mx-auto size-20 animate-[plus-pop_600ms_cubic-bezier(.2,1.4,.4,1)_both]">
          <MainLogo />
        </div>

        <h1 className="relative mt-5 text-2xl font-extrabold plus-ink">{title}</h1>
        <p className="relative mt-2 text-sm text-muted-foreground">{subtitle}</p>

        <div className="relative mt-6 text-right">{children}</div>

        <div className="relative mt-6 flex flex-col items-center gap-3">
          <ShinyButton
            type="button"
            onClick={() => router.push(primary.href)}
            className="w-full border-primary/50 py-3 sm:w-72"
          >
            {primary.label}
          </ShinyButton>
        </div>
      </section>
    </>
  );
}
