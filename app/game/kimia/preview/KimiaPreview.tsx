"use client";

import "./kimia-dev.css";

import { StrictMode, useMemo, useRef, useState } from "react";
import KimiaGame from "@/components/UI/kimia/KimiaGame";
import { MAX_ATTEMPTS } from "@/lib/kimia/round-state";
import SfxPanel from "./SfxPanel";
import { KIMIA_METERS } from "@/lib/kimia/catalog";
import type { KimiaRevealResult, KimiaSource } from "@/lib/kimia/source";
import { KimiaSourceError } from "@/lib/kimia/source";
import type { FootKey, KimiaRound, KimiaSolution, KimiaVerdict } from "@/lib/kimia/types";

/* ═══════════════════════════════════════════════════════════════════════════
   میزِ تنظیمِ انیمیشن‌ها.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ فقط *منبعِ داده* ساختگی است؛ بازی و منطقش عیناً همان چیزی است که روی
   هاست اجرا می‌شود. ارکان و اوزان هم واقعی‌اند و از `KIMIA_METERS` می‌آیند —
   چیزی که ساخته شده فقط خودِ بیت‌هاست و شناسه‌ها.

   ⚠️ گزینهٔ «تعدادِ رکن» از دادهٔ واقعی فراتر می‌رود (بانک امروز فقط اوزانِ
   سه و چهار رکنی دارد) و عمداً: `MAX_SLOTS` هشت است و رَک و خطِ زمانی باید
   همان‌جا هم درست بمانند، وگرنه اولین وزنِ هشت‌رکنی که به بانک اضافه شود،
   روی گوشی اسکرولِ افقی می‌سازد.
   ═══════════════════════════════════════════════════════════════════════════ */

const VERSES: readonly (readonly [string, string])[] = [
  ["بشنو این نی چون شکایت می‌کند", "از جدایی‌ها حکایت می‌کند"],
  ["الا یا ایها الساقی ادر کأسا و ناولها", "که عشق آسان نمود اول ولی افتاد مشکل‌ها"],
  ["توانا بود هر که دانا بود", "ز دانش دل پیر برنا بود"],
  ["بنی‌آدم اعضای یک پیکرند", "که در آفرینش ز یک گوهرند"],
];

type Verdict = "server" | "always-correct" | "always-wrong" | "network-error";
type Audio = "file" | "none";

export default function KimiaPreview() {
  const [slotCount, setSlotCount] = useState(0); // ۰ = هرچه وزنِ واقعی دارد
  const [latency, setLatency] = useState(260);
  const [verdictMode, setVerdictMode] = useState<Verdict>("server");
  const [audioMode, setAudioMode] = useState<Audio>("file");
  /* ⚠️ پیش‌فرض *بسته*: پنلِ باز روی دکمه‌ها می‌افتاد و کلیک را می‌دزدید
     (هم برای کاربر و هم برای Playwright). */
  const [panelOpen, setPanelOpen] = useState(false);
  /* شمارندهٔ دور — ref و نه متغیرِ داخلِ memo، تا قاعدهٔ immutabilityِ
     React Compiler راضی بماند. */
  const served = useRef(0);

  const source = useMemo<KimiaSource>(() => {
    const pool = KIMIA_METERS.filter(
      (meter) => slotCount === 0 || meter.canonical.length === slotCount,
    );
    /* وزنی با این تعدادِ رکن در بانک نیست (مثلاً ۸): یکی ساختگی از روی
       ارکانِ واقعی می‌سازیم، فقط برای سنجشِ هندسه. */
    const padded = (base: readonly FootKey[]): FootKey[] => {
      const out = [...base];
      while (out.length < slotCount) out.push(base[out.length % base.length]);
      return out.slice(0, slotCount);
    };

    const answers = new Map<string, readonly FootKey[]>();
    /* ⚠️ شمارندهٔ تلاشِ *ساختگی*، به‌ازای هر دور. منبعِ واقعی این را از
       ردیفِ دیتابیس می‌گیرد؛ اینجا فقط برای دیدنِ نقطه‌های تلاش و چرخشِ
       کارت بدونِ دیتابیس لازم است. */
    const tries = new Map<string, number>();
    const opened = new Set<string>();

    return {
      async startRound(): Promise<KimiaRound> {
        await sleep(latency);
        const n = served.current;
        served.current = n + 1;
        const meter = (pool.length ? pool : KIMIA_METERS)[n % (pool.length || KIMIA_METERS.length)];
        const feet = slotCount === 0 ? meter.canonical : padded(meter.canonical);
        const verse = VERSES[n % VERSES.length];
        const questionId = `preview-${n}`;
        answers.set(questionId, feet);
        return {
          roundId: `preview-round-${n + 1}`,
          questionId,
          verse: [verse[0], verse[1]],
          slotCount: feet.length,
          /* ⚠️ اینجا — و *فقط* اینجا — آدرسِ خودِ فایل داده می‌شود. در
             بازیِ واقعی این کار ممنوع است، چون نامِ فایل خودش پاسخ است و
             در تبِ Network دیده می‌شود؛ سرور برای همین
             `/api/v1/kimia/rhythm/<questionId>` را سرو می‌کند. پیش‌نمایش
             هیچ‌وقت منتشر نمی‌شود و بدونِ صدای واقعی نمی‌شود هماهنگیِ
             بردر با `currentTime` را سنجید.

             حالتِ «بدونِ فایل» هم باید دیده شود: آن‌وقت بردر با ساعتِ
             شبیه‌سازی‌شده پر می‌شود. */
          rhythmUrl:
            audioMode === "file"
              ? encodeURI(`/audio/${meter.ark.trim().replace(/\s+/g, "-")}.mp3`)
              : "",
        };
      },

      async submitAttempt(input): Promise<KimiaVerdict> {
        await sleep(latency);
        if (verdictMode === "network-error") {
          throw new KimiaSourceError("پیش‌نمایش: خطای شبکهٔ ساختگی.");
        }
        const answer = answers.get(input.questionId) ?? [];
        const matches = answer.length === input.selected.length &&
          answer.every((foot, i) => foot === input.selected[i]);
        const isCorrect =
          verdictMode === "always-correct" ? true : verdictMode === "always-wrong" ? false : matches;

        const used = Math.min(MAX_ATTEMPTS, (tries.get(input.roundId) ?? 0) + 1);
        tries.set(input.roundId, used);
        const exhausted = !isCorrect && used >= MAX_ATTEMPTS;
        if (exhausted) opened.add(input.roundId);
        const open = isCorrect || opened.has(input.roundId);

        return {
          isCorrect,
          errorType: isCorrect ? null : "ORDER_ONLY",
          hint: isCorrect ? null : "ترتیبِ ارکان با ریتم نمی‌خواند.",
          meterName: isCorrect ? "وزنِ نمونه (پیش‌نمایش)" : null,
          acceptedSequence: isCorrect ? answer : null,
          saved: false,
          attemptsCount: used,
          remaining: open ? 0 : Math.max(0, MAX_ATTEMPTS - used),
          revealed: opened.has(input.roundId),
          solution: open ? previewSolution(answer) : null,
        };
      },

      async reveal(input): Promise<KimiaRevealResult> {
        await sleep(latency);
        /* ⚠️ همان شرطِ سرور: بدونِ حتی یک تلاش، پاسخ باز نمی‌شود. اگر
           پیش‌نمایش سهل‌گیرتر از سرور باشد، همان اختلاف است که بعداً
           به‌شکلِ «روی من کار می‌کرد» برمی‌گردد. */
        if ((tries.get(input.roundId) ?? 0) === 0) {
          throw new KimiaSourceError("اول یک بار ترکیب را آزمایش کن.", "no-attempt-yet");
        }
        opened.add(input.roundId);
        return {
          solution: previewSolution(answers.get(input.questionId) ?? []),
          saved: false,
          revealed: true,
          remaining: 0,
        };
      },
    };
  }, [audioMode, latency, slotCount, verdictMode]);

  /* ⚠️ فقط در توسعه ساخته می‌شود. صفحه‌اش هم در production اصلاً وجود
     ندارد (`notFound`)، ولی این شرط تضمین می‌کند حتی اگر کسی کامپوننت را
     جای دیگری وارد کند، چیزی به باندلِ production اضافه نشود. */
  const dev = process.env.NODE_ENV === "development";
  const gameKey = `${slotCount}-${latency}-${verdictMode}-${audioMode}`;
  const strict =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("strict");

  return (
    <div dir="rtl">
      {dev && !panelOpen && (
        <button
          type="button"
          style={TOGGLE}
          className="km-dev-toggle"
          onClick={() => setPanelOpen(true)}
        >
          پیش‌نمایشِ توسعه
        </button>
      )}

      {dev && panelOpen && (
      <div style={BAR} className="km-dev-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 13 }}>پیش‌نمایشِ توسعه</strong>
          <button type="button" style={INPUT} onClick={() => setPanelOpen(false)} aria-label="بستن">
            ×
          </button>
        </div>

        <label style={LABEL}>
          تعدادِ رکن
          <select
            value={slotCount}
            onChange={(e) => setSlotCount(Number(e.target.value))}
            style={INPUT}
          >
            <option value={0}>وزنِ واقعی (۳ یا ۴)</option>
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label style={LABEL}>
          تأخیرِ شبکه
          <select value={latency} onChange={(e) => setLatency(Number(e.target.value))} style={INPUT}>
            <option value={0}>۰</option>
            <option value={260}>۲۶۰ms</option>
            <option value={1500}>۱٫۵s (نبضِ سنجش)</option>
            <option value={4200}>۴٫۲s (کندتر از انیمیشن)</option>
            <option value={8000}>۸s (خیلی کند)</option>
          </select>
        </label>

        <label style={LABEL}>
          داوری
          <select
            value={verdictMode}
            onChange={(e) => setVerdictMode(e.target.value as Verdict)}
            style={INPUT}
          >
            <option value="server">مثلِ سرور</option>
            <option value="always-correct">همیشه درست</option>
            <option value="always-wrong">همیشه غلط</option>
            <option value="network-error">خطای شبکه</option>
          </select>
        </label>

        <label style={LABEL}>
          صدا
          <select
            value={audioMode}
            onChange={(e) => setAudioMode(e.target.value as Audio)}
            style={INPUT}
          >
            <option value="file">فایلِ واقعی</option>
            <option value="none">بدونِ فایل (شبیه‌سازی)</option>
          </select>
        </label>

        <button type="button" style={INPUT} onClick={() => location.reload()}>
          بارگذاریِ دوباره
        </button>

        <SfxPanel />
      </div>
      )}

      {/* ⚠️ `key` باعث می‌شود عوض کردنِ تنظیمات بازی را از نو بسازد؛ وگرنه
          منبعِ تازه وسطِ یک نشستِ نیمه‌تمام می‌نشست. */}
      {strict ? (
        /* ⚠️ `?strict=1` بازی را داخلِ StrictMode می‌گذارد — یعنی هر
           کامپوننت دوبار سوار می‌شود. این همان شرایطی است که یک بار
           پروازِ شیشه‌ها را بی‌صدا از کار انداخت (توضیح در
           `lib/kimia/scene.ts`)، و تستِ `strict.mjs` با همین سوئیچ ثابت
           می‌کند هندسه در هر دو حالت یکی است. */
        <StrictMode>
          <KimiaGame key={gameKey} source={source} />
        </StrictMode>
      ) : (
        <KimiaGame key={gameKey} source={source} />
      )}
    </div>
  );
}

/**
 * پاسخِ ساختگیِ پیش‌نمایش.
 *
 * ⚠️ `accepted` عمداً *دو* خوانش دارد: وجهِ پشتِ کارت باید بتواند «خوانشِ
 * دیگر» را هم نشان بدهد، و اگر پیش‌نمایش همیشه یک خوانش بدهد آن شاخه
 * هیچ‌وقت با چشم دیده نمی‌شود.
 */
function previewSolution(canonical: readonly FootKey[]): KimiaSolution {
  return {
    meterName: "وزنِ نمونه (پیش‌نمایش)",
    canonical,
    accepted: canonical.length > 2 ? [canonical, [...canonical].reverse()] : [canonical],
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ⚠️ ستونیِ باریک در گوشه، و نه نوارِ پهنِ پایین: نسخهٔ پهن روی دکمهٔ
   «آزمایش ترکیب» می‌افتاد و کلیک را می‌دزدید. */
/* ⚠️ `right`/`bottom`ِ فیزیکی و نه منطقی: این پنل باید *همیشه* گوشهٔ
   پایین راست باشد، مستقل از جهتِ صفحه. */
const TOGGLE: React.CSSProperties = {
  position: "fixed",
  right: 8,
  /* ⚠️ روی صفحهٔ باریک، نوارِ اقدام به کفِ صفحه چسبیده است و یک چیپِ
     گوشهٔ پایین دقیقاً روی «واگرد/از نو» می‌افتاد. پس بالای آن می‌نشیند. */
  bottom: 8,
  zIndex: 200,
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgb(127 127 127 / .35)",
  background: "rgb(20 20 24 / .75)",
  color: "#eaf0f8",
  font: "inherit",
  fontSize: 11,
  cursor: "pointer",
};

const BAR: React.CSSProperties = {
  position: "fixed",
  right: 8,
  bottom: 8,
  zIndex: 200,
  width: 210,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgb(127 127 127 / .35)",
  background: "rgb(20 20 24 / .82)",
  color: "#eaf0f8",
  fontSize: 12,
  backdropFilter: "blur(6px)",
};

const LABEL: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
};

const INPUT: React.CSSProperties = {
  font: "inherit",
  color: "inherit",
  background: "rgb(255 255 255 / .08)",
  border: "1px solid rgb(127 127 127 / .4)",
  borderRadius: 8,
  padding: "3px 6px",
};
