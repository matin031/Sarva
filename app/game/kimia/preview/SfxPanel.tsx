"use client";

import { useRef, useState } from "react";
import {
  SFX_DEFAULTS,
  playKimiaSfx,
  sfxParams,
  setSfxParams,
  startPourVoice,
  unlockSfx,
  type KimiaSfx,
  type SfxParams,
} from "@/lib/kimia/sfx";

/**
 * میزِ تنظیمِ صدا — فقط توسعه.
 *
 * ⚠️ کیفیتِ صدا assert‌شدنی نیست و با گوش تنظیم می‌شود. این پنل برای
 * همان است: هر صدا یک دکمهٔ پخش و چند اسلایدر دارد، «شبیه‌سازیِ ریختن»
 * سه ثانیه جریان را با یک منحنیِ ثابت پخش می‌کند، و «کپی مقدارها»
 * خروجیِ نهایی را می‌دهد تا در `SFX_DEFAULTS` ثابت شود.
 *
 * ⚠️ این فایل زیرِ `app/game/kimia/preview` است و آن مسیر در production
 * اصلاً رندر نمی‌شود، پس چیزی از این پنل به دستِ کاربر نمی‌رسد.
 */
export default function SfxPanel() {
  const [params, setParams] = useState<SfxParams>(() => structuredClone(sfxParams()));
  const [copied, setCopied] = useState(false);
  const simulating = useRef(false);

  const apply = (next: SfxParams) => {
    setParams(next);
    setSfxParams(next);
  };

  const patch = <K extends keyof SfxParams>(key: K, part: Partial<SfxParams[K]>) => {
    const next = { ...params, [key]: { ...(params[key] as object), ...part } } as SfxParams;
    apply(next);
  };

  const play = (name: KimiaSfx) => {
    unlockSfx();
    playKimiaSfx(name);
  };

  /** سه ثانیه جریان با منحنیِ ثابت — برای تنظیمِ گوشیِ گین و فرکانس. */
  const simulate = () => {
    if (simulating.current) return;
    unlockSfx();
    const voice = startPourVoice();
    if (!voice) return;
    simulating.current = true;
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 3000;
      if (t >= 1) {
        voice.stop();
        simulating.current = false;
        return;
      }
      /* جریان: بالا می‌آید، اوج می‌گیرد، ته می‌کشد. سطح: صفر تا یک. */
      const flow = Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.7;
      voice.set(flow, t);
      if (Math.random() < 0.12 * flow) voice.bubble(flow);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const copy = () => {
    void navigator.clipboard?.writeText(JSON.stringify(params, null, 2)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ) => (
    <label key={label} style={ROW}>
      <span style={{ width: 58, opacity: 0.75 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        /* ⚠️ `minWidth: 0` و `width: 0`: ورودیِ range در کروم یک عرضِ
           کمینهٔ ~۱۳۰ پیکسلی دارد و بدونِ این، کلِ سطر از پنل بیرون
           می‌زد و دکمه‌های «پخش» از کادر خارج می‌شدند. */
        style={{ flex: 1, minWidth: 0, width: 0 }}
      />
      <span style={{ width: 40, flex: "none", textAlign: "left", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </label>
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        maxHeight: "52vh",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <strong style={{ fontSize: 12 }}>صدا</strong>

      {slider("master", params.master, 0, 1, 0.01, (v) => apply({ ...params, master: v }))}

      <Group title="تیکِ لمس" onPlay={() => play("valve")}>
        {slider("گین", params.tick.gain, 0, 1, 0.01, (v) => patch("tick", { gain: v }))}
        {slider("فرکانس", params.tick.freq, 600, 5000, 20, (v) => patch("tick", { freq: v }))}
        {slider("طول", params.tick.ms, 10, 200, 5, (v) => patch("tick", { ms: v }))}
      </Group>

      <Group title="نشستن" onPlay={() => play("settle")}>
        {slider("گین", params.settle.gain, 0, 1, 0.01, (v) => patch("settle", { gain: v }))}
        {slider("فرکانس", params.settle.freq, 80, 900, 5, (v) => patch("settle", { freq: v }))}
        {slider("طول", params.settle.ms, 30, 400, 5, (v) => patch("settle", { ms: v }))}
        {slider("طنین", params.settle.ringFreq, 500, 4000, 20, (v) => patch("settle", { ringFreq: v }))}
      </Group>

      <Group title="برگشت" onPlay={() => play("drain")}>
        {slider("گین", params.ret.gain, 0, 1, 0.01, (v) => patch("ret", { gain: v }))}
        {slider("فرکانس", params.ret.freq, 80, 900, 5, (v) => patch("ret", { freq: v }))}
        {slider("طول", params.ret.ms, 30, 400, 5, (v) => patch("ret", { ms: v }))}
      </Group>

      <Group title="ریختن" onPlay={simulate} playLabel="شبیه‌سازی ۳ثانیه">
        {slider("گین", params.pour.gain, 0, 1, 0.01, (v) => patch("pour", { gain: v }))}
        {slider("از", params.pour.fromHz, 200, 2000, 20, (v) => patch("pour", { fromHz: v }))}
        {slider("تا", params.pour.toHz, 800, 6000, 20, (v) => patch("pour", { toHz: v }))}
        {slider("Q", params.pour.q, 0.2, 4, 0.1, (v) => patch("pour", { q: v }))}
        {slider("حباب", params.pour.bubbles, 0, 2, 0.1, (v) => patch("pour", { bubbles: v }))}
        {slider("حبابِ گین", params.bubble.gain, 0, 1, 0.01, (v) => patch("bubble", { gain: v }))}
      </Group>

      <Group title="حل شدن" onPlay={() => play("blend")}>
        {slider("گین", params.blend.gain, 0, 1, 0.01, (v) => patch("blend", { gain: v }))}
        {slider("از", params.blend.fromHz, 400, 5000, 20, (v) => patch("blend", { fromHz: v }))}
        {slider("طول", params.blend.ms, 200, 1500, 20, (v) => patch("blend", { ms: v }))}
      </Group>

      <Group title="درست" onPlay={() => play("correct")}>
        {slider("گین", params.correct.gain, 0, 1, 0.01, (v) => patch("correct", { gain: v }))}
        {slider("نت", params.correct.freq, 200, 1200, 1, (v) => patch("correct", { freq: v }))}
        {slider("طول", params.correct.ms, 60, 500, 10, (v) => patch("correct", { ms: v }))}
      </Group>

      <Group title="غلط" onPlay={() => play("wrong")}>
        {slider("گین", params.wrong.gain, 0, 1, 0.01, (v) => patch("wrong", { gain: v }))}
        {slider("فرکانس", params.wrong.freq, 40, 400, 2, (v) => patch("wrong", { freq: v }))}
        {slider("طول", params.wrong.ms, 60, 500, 10, (v) => patch("wrong", { ms: v }))}
      </Group>

      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={BTN} onClick={copy}>
          {copied ? "کپی شد" : "کپی مقدارها"}
        </button>
        <button type="button" style={BTN} onClick={() => apply(structuredClone(SFX_DEFAULTS))}>
          بازنشانی
        </button>
      </div>
    </div>
  );
}

function Group({
  title,
  onPlay,
  playLabel = "پخش",
  children,
}: {
  title: string;
  onPlay: () => void;
  playLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 4, paddingTop: 4, borderTop: "1px solid rgb(127 127 127 / .25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ opacity: 0.85 }}>{title}</span>
        <button type="button" style={BTN} onClick={onPlay}>
          {playLabel}
        </button>
      </div>
      {children}
    </div>
  );
}

const ROW: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 11 };

const BTN: React.CSSProperties = {
  font: "inherit",
  fontSize: 11,
  color: "inherit",
  background: "rgb(255 255 255 / .1)",
  border: "1px solid rgb(127 127 127 / .4)",
  borderRadius: 8,
  padding: "2px 8px",
  cursor: "pointer",
};
