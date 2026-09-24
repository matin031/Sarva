"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/UI/kit/Accordion";
import styles from "./home.module.css";

/* ⚠️ فقط سؤال و جواب. هر ردیف قبلاً یک کاشیِ آیکون و یک برچسبِ ریز بالای
   سؤال داشت («مخاطبان سروا»، «اولین قدم»…) که همان سؤال را دوباره می‌گفت؛
   سه لایه برای یک جمله. */
const faqs = [
  { question: "سروا برای چه کسانی است؟", answer: "دانش‌آموزان دهم، یازدهم و دوازدهم، دبیرهای ادبیات و هر کسی که شعر فارسی را دوست دارد." },
  { question: "از کجا شروع کنم؟", answer: "برای مرور کتاب از درسنامه، برای امتحان از بخش امتحان‌های نهایی. اگر تمرین کوتاه می‌خواهی، بازی‌ها یا عروض سماعی." },
  { question: "برای استفاده باید ثبت‌نام کنم؟", answer: "نه. درسنامه و بیشتر ابزارها بدون حساب هم باز می‌شوند. برای ذخیرهٔ نتیجه‌ها و بعضی تمرین‌ها باید وارد شوی." },
  { question: "برای یادگیری عروض پیش‌نیاز لازم است؟", answer: "نه. از راهنمای یادگیری شروع کن، با وزن‌یاب وزن چند بیت را ببین و بعد سراغ تمرین‌های شنیداری برو." },
];

export default function HomeFaq() {
  return (
    <section className={`container ${styles.faqSection}`} aria-labelledby="faq-title" dir="rtl">
      <div className={styles.faqIntro}>
        <h2 id="faq-title">سؤال‌های رایج</h2>
        <Link href="/guide" className={styles.textLink}>راهنمای یادگیری <ArrowLeft size={17} aria-hidden="true" /></Link>
      </div>
      <Accordion type="single" collapsible dir="rtl" className={styles.faqList}>
        {faqs.map(({ question, answer }, index) => (
          <AccordionItem key={question} value={`faq-${index}`} className={styles.faqItem}>
            <AccordionTrigger className={styles.faqTrigger}>
              <span className={styles.faqTitle}>{question}</span>
            </AccordionTrigger>
            <AccordionContent className={styles.faqAnswer}>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
