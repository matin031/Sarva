"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, FileText, Headphones, Music2, ScanSearch } from "lucide-react";
import { Highlighter } from "./Highlighter";
import styles from "./home.module.css";

function LoadingDemo() { return <div className={styles.demoLoading} role="status">در حال آماده‌سازی پیش‌نمایش…</div>; }
const MeterDemo = dynamic(() => import("@/components/UI/vazn-yab-demo/VaznYabDemo"), { loading: LoadingDemo });
const ExamDemo = dynamic(() => import("@/components/UI/exam-demo/ExamDemo"), { loading: LoadingDemo });
const VocabDemo = dynamic(() => import("@/components/UI/vocab-demo/VocabChallengeDemo"), { loading: LoadingDemo });
const AruzDemo = dynamic(() => import("@/components/UI/orouz-demo/OrouzDemo"), { loading: LoadingDemo });
const demos = [
  { id: "meter", label: "وزن‌یاب", icon: Music2, title: "ریتمِ پنهانِ شعر را پیدا کن", description: "بیت را وارد کن؛ وزن، ارکان و بحرِ آن را ببین و ضرب‌آهنگش را بشنو. یک راهِ ملموس برای آشنا شدن با موسیقیِ شعر.", href: "/vazn-yab", cta: "خودت وزن‌یاب را امتحان کن", component: MeterDemo },
  { id: "exam", label: "امتحان نهایی", icon: FileText, title: "سؤال‌به‌سؤال، برای امتحان آماده شو", description: "سؤال‌ها را در قالب تعاملی پاسخ بده و با بررسی پاسخ و نتیجه، نکته‌هایی را که باید دوباره بخوانی پیدا کن.", href: "/exam", cta: "انتخاب یک امتحان", component: ExamDemo },
  { id: "vocab", label: "واژه‌یاب", icon: ScanSearch, title: "یک تصویر، یک واژه، یک چالش", description: "تصویر را ببین و واژهٔ درست را پیش از پایان زمان انتخاب کن. تمرینی کوتاه برای مرور معنی واژه‌ها در قالب بازی.", href: "/game/vocab", cta: "بازی واژه‌یاب را شروع کن", component: VocabDemo },
  { id: "aruz", label: "عروض سماعی", icon: Headphones, title: "وزنِ شعر را با گوش بشناس", description: "ریتم‌ها را بشنو و با انتخاب وزن، بیت یا صدای درست، تشخیص آهنگ شعر را تمرین کن؛ قدم‌به‌قدم، از شنیدن تا شناختن.", href: "/aruz", cta: "شروع عروض سماعی", component: AruzDemo },
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
        <div className={styles.demoHeading}><span className={styles.kicker}>از نزدیک ببین</span><h2 id="demos-title">یادگیری، وقتی <Highlighter>زنده می‌شود.</Highlighter></h2><p>نگاهی به تجربهٔ کار با ابزارهای سروا؛ بعد، نوبت توست.</p></div>
        <div className={styles.demoTabs} role="tablist" aria-label="پیش‌نمایش ابزارهای سروا">
          {demos.map(({ id, label, icon: Icon }, index) => <button key={id} ref={(element) => { buttons.current[index] = element; }} type="button" role="tab" id={`demo-tab-${id}`} aria-controls={`demo-panel-${id}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onKeyDown(event, index)}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </div>
        {demos.map(({ id }, index) => <div key={id} id={`demo-panel-${id}`} role="tabpanel" aria-labelledby={`demo-tab-${id}`} tabIndex={0} hidden={index !== active} className={styles.demoPanel}>
          {index === active && <>
          <div className={styles.demoCopy}>
            <span className={styles.demoIndex} aria-hidden="true">{(active + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}<span> / ۰۴</span></span>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <Link href={current.href} className={styles.primaryButton}>{current.cta}<ArrowLeft size={17} aria-hidden="true" /></Link>
            <span className={styles.demoHint}>این نمایش خودکار است؛ برای تجربهٔ واقعی، وارد ابزار شو.</span>
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
