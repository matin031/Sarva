"use client";

import "./kimia.css";

import { useLayoutEffect, useRef, useState } from "react";
import KimiaHero from "./KimiaHero";
import SessionPicker from "./SessionPicker";
import { GameBarPlain } from "./GameBar";
import { Button } from "@/components/UI/kit/button";
import { unlockSfx } from "@/lib/kimia/sfx";
import type { SessionLength } from "@/lib/kimia/config";

/**
 * صفحهٔ شروع — متن، انتخاب، و خودِ بازی که کنارش کار می‌کند.
 *
 * ── چرا کارت رفت ─────────────────────────────────────────────────────────
 * ⚠️ نسخهٔ قبل یک «کنسولِ شیشه‌ای» بود: قابی با سه لایه پس‌زمینه، بازتاب،
 * سایهٔ نرمِ بزرگ و ورودِ پلکانی، که تیتر و لید و انتخاب و دکمه را داخلِ
 * خودش نگه می‌داشت. آن قاب *هیچ کاری نمی‌کرد* — نه چیزی را از چیزِ دیگری
 * جدا می‌کرد و نه سلسله‌مراتبی می‌ساخت؛ فقط صفحه را به یک جعبهٔ کوچک
 * محدود می‌کرد و کنارش جعبهٔ دومی (پیش‌نمایش) می‌گذاشت. حالا متن مستقیم
 * روی صفحه می‌نشیند و تنها چیزی که قاب دارد همان چیزی است که واقعاً یک
 * شیء است: باکسِ بیت.
 *
 * ⚠️ «آزمایشگاهِ عروض» هم رفت. یک برچسبِ تزئینی بالای تیتر بود که چیزی به
 * آن اضافه نمی‌کرد و فقط چشم را یک سطر معطل می‌کرد.
 *
 * ⚠️ و تیتر *یک بار* می‌آید: نوارِ بالا تا دیروز «کیمیای وزن» را تکرار
 * می‌کرد، دقیقاً هشت سانتی‌متر بالاتر از همان کلمه در `<h1>`.
 *
 * ── تقسیمِ کار ────────────────────────────────────────────────────────────
 *   راست (دسکتاپ): تیتر، یک جمله، انتخابِ طول، شروع.
 *   چپ  (دسکتاپ): پیش‌نمایشِ زنده. تنها چیزی که حرکت دارد.
 *
 * ⚠️ در DOM ترتیب «متن → پیش‌نمایش → کنترل‌ها»ست و چیدمانِ دسکتاپ با
 * grid-areaها بازچینی می‌شود. دلیلش موبایل است: آنجا ترتیبِ خواندن باید
 * دقیقاً همین باشد — اول بفهم چیست، بعد ببین چه شکلی است، بعد انتخاب کن.
 * و چون ترتیبِ DOM همان ترتیبِ Tab است، کاربرِ صفحه‌کلید هم همین را
 * می‌گیرد (پیش‌نمایش `aria-hidden` و بیرون از مسیرِ Tab است).
 */
export default function KimiaIntro({
  length,
  onLengthChange,
  onStart,
}: {
  length: SessionLength;
  onLengthChange: (next: SessionLength) => void;
  onStart: (length: SessionLength) => void;
}) {
  const [starting, setStarting] = useState(false);
  const clicked = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * قدِ پوستهٔ سایت که بالای این صفحه می‌ماند.
   *
   * ⚠️ صفحهٔ معرفی — برخلافِ خودِ بازی — سربرگِ سایت را نگه می‌دارد
   * (`immersiveMode` روی `compact` است، چون راهِ بازگشت و هویتِ سروا باید
   * بمانند). پس «کلِ صفحه در ارتفاعِ مرئی» یعنی `100dvh` *منهای* همان
   * سربرگ، و CSS به‌تنهایی این عدد را نمی‌داند.
   *
   * ⚠️ اندازه از فاصلهٔ خودِ ریشه تا بالای سند خوانده می‌شود و نه از
   * انتخابگرِ سربرگ: این‌طور با سربرگِ ثابت، چسبان، یا `padding`ِ والد
   * هم کار می‌کند و به ساختارِ پوسته گره نمی‌خورد.
   *
   * ⚠️ و یک بار اندازه گرفتن *کافی نبود*. در اولین رندر پوسته هنوز
   * جابه‌جا می‌شود (پردهٔ ورودی، سربرگی که دو ردیفه شروع می‌کند) و عددی
   * که آن لحظه خوانده می‌شد دو برابرِ عددِ نهایی درمی‌آمد — یعنی صفحه
   * ۶۶ پیکسل کوتاه‌تر از جای واقعی‌اش تمام می‌شد. حالا هر تغییرِ اندازه‌ای
   * در سند دوباره اندازه می‌گیرد.
   *
   * ⚠️ نوشتن فقط وقتی مقدار *عوض شده* — وگرنه ناظر، تغییرِ ارتفاعِ خودِ
   * این عنصر را می‌دید و بی‌نهایت دور می‌زد.
   *
   * ⚠️ `useLayoutEffect` و نه `useEffect`: با دومی، مرورگر یک قابِ کامل
   * را با ارتفاعِ `100dvh` می‌کشید و بعد صفحه کوتاه می‌شد — یعنی یک
   * پرشِ دیدنی، و در اندازه‌گیری یک CLSِ واقعی روی پیش‌نمایش.
   */
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let last = -1;
    const apply = () => {
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
      if (top === last) return;
      last = top;
      el.style.setProperty("--km-chrome", `${top}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(document.body);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div ref={rootRef} className="km-intro" dir="rtl">
      {/* ⚠️ پس‌زمینهٔ جدا (ذراتِ معلق، تاریکیِ گوشه‌ها، ستونِ نور) برداشته شد:
          صفحهٔ شروع روی زمینه و نقشِ خودِ سایت می‌نشیند، مثلِ هر صفحهٔ دیگری،
          و تنها چیزِ درخشان همان بالن است. */}
      {/* ⚠️ بدونِ برچسب: تیترِ صفحه همان `<h1>`ِ پایین است. */}
      <GameBarPlain />

      <div className="km-intro-stage">
        <div className="km-intro-head">
          <h1 className="km-intro-title game-display">کیمیای وزن</h1>
          {/* ⚠️ یک جملهٔ کامل، و نه سه تکهٔ چسبیده به هم. نسخهٔ قبل
              «ریتم را بشنو، ارکان را بریز، وزن را بساز.» بود که «بریز»
              را بی‌مفعول رها می‌کرد. */}
          <p className="km-intro-lede">
            ریتم بیت را بشنو و ارکانش را به ترتیب در ظرف بریز. ترکیب درست پایدار می‌ماند.
          </p>
        </div>

        <div className="km-intro-preview-slot">
          <KimiaHero />
        </div>

        <div className="km-intro-controls">
          <SessionPicker value={length} onChange={onLengthChange} disabled={starting} />

          <Button
            type="button"
            size="lg"
            className="km-intro-cta"
            disabled={starting}
            onClick={() => {
              if (clicked.current) return;
              clicked.current = true;
              setStarting(true);
              /* ⚠️ قفلِ صدا دقیقاً همین‌جا باز می‌شود و نه در یک effect:
                 این تنها ژستِ تضمین‌شدهٔ کاربر پیش از شروعِ بازی است، و
                 مرورگر AudioContext را بیرون از ژست بیدار نمی‌کند. */
              unlockSfx();
              onStart(length);
            }}
          >
            {/* ⚠️ برچسب *عوض نمی‌شود* و اسپینر مطلق است. نسخهٔ اول متن را
                با «در حالِ آماده‌سازی…» جا‌به‌جا می‌کرد؛ همان چیزی که در
                دکمهٔ خودِ بازی یک بار CLS ساخت. */}
            <span className="km-intro-cta-label" data-busy={starting || undefined}>
              شروع آزمایش
            </span>
            <span className="km-intro-cta-spin" data-on={starting || undefined} aria-hidden />
          </Button>

          {/* ⚠️ این «نکتهٔ کوچک» نیست، شرطِ بازی است: سؤال از روی *صدا*
              فهمیده می‌شود و کسی که بی‌صدا شروع کند فکر می‌کند بازی
              خراب است. */}
          <p className="km-intro-note">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4z" />
              <path strokeLinecap="round" d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            صدا را روشن بگذار؛ ریتم بیت بخشی از سؤال است.
          </p>
        </div>
      </div>
    </div>
  );
}
