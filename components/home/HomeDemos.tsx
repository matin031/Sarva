"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, FileText, Headphones, Music2, ScanSearch } from "lucide-react";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import styles from "./home.module.css";

function LoadingDemo() { return <div className={styles.demoLoading} role="status">در حال بارگذاری…</div>; }
const MeterDemo = dynamic(() => import("@/components/UI/vazn-yab-demo/VaznYabDemo"), { loading: LoadingDemo });
const ExamDemo = dynamic(() => import("@/components/UI/exam-demo/ExamDemo"), { loading: LoadingDemo });
const VocabDemo = dynamic(() => import("@/components/UI/vocab-demo/VocabChallengeDemo"), { loading: LoadingDemo });
const AruzDemo = dynamic(() => import("@/components/UI/orouz-demo/OrouzDemo"), { loading: LoadingDemo });
const demos = [
  { id: "meter", label: "وزن‌یاب", icon: Music2, title: "وزن هر بیتی را پیدا کن", description: "بیت را بنویس تا وزن، ارکان و بحرش را ببینی و آهنگش را بشنوی.", href: "/vazn-yab", cta: "رفتن به وزن‌یاب", component: MeterDemo },
  { id: "exam", label: "امتحان نهایی", icon: FileText, title: "امتحان‌های نهایی سال‌های قبل", description: "به سؤال‌ها جواب بده و در پایان ببین کجاها را اشتباه کرده‌ای.", href: "/exam", cta: "انتخاب یک امتحان", component: ExamDemo },
  { id: "vocab", label: "واژه‌یاب", icon: ScanSearch, title: "معنی واژه‌ها با تصویر", description: "تصویر را ببین و قبل از تمام شدن وقت، واژهٔ درست را انتخاب کن.", href: "/game/vocab", cta: "شروع بازی", component: VocabDemo },
  { id: "aruz", label: "عروض سماعی", icon: Headphones, title: "وزن شعر را با شنیدن یاد بگیر", description: "ریتم را بشنو و وزن یا بیت درست را انتخاب کن.", href: "/aruz", cta: "شروع عروض سماعی", component: AruzDemo },
];

export default function HomeDemos() {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = demos[active];
  const Demo = current.component;
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    let next: number;
    // The visual order is RTL: left advances and right returns.
    if (event.key === "ArrowLeft") next = (index + 1) % demos.length;
    else if (event.key === "ArrowRight") next = (index - 1 + demos.length) % demos.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = demos.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  }
  return (
    <section id="try-sarva" className={styles.demoSection} aria-labelledby="demos-title">
      <div className="container">
        <div className={styles.demoHeading}><h2 id="demos-title">ابزارها را ببین</h2></div>
        <div className={styles.demoTabs} role="tablist" aria-label="پیش‌نمایش ابزارهای سروا">
          {demos.map(({ id, label, icon: Icon }, index) => <button key={id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab" id={`demo-tab-${id}`} aria-controls={`demo-panel-${id}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onKeyDown(event, index)}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </div>
        {demos.map(({ id }, index) => <div key={id} id={`demo-panel-${id}`} role="tabpanel" aria-labelledby={`demo-tab-${id}`} tabIndex={0} hidden={index !== active} className={styles.demoPanel}>
          {index === active && <>
          <div className={styles.demoCopy}>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <ShinyButton asChild>
              <Link href={current.href}>{current.cta}<ArrowLeft size={17} aria-hidden="true" /></Link>
            </ShinyButton>
            <span className={styles.demoHint}>این فقط یک نمایش است.</span>
          </div>
          <div className={styles.demoStage}>
            <div className={styles.demoStageLabel}><span /> پیش‌نمایش {current.label}</div>
            <Demo key={current.id} />
          </div>
          </>}
        </div>)}
      </div>
    </section>
  );
}
