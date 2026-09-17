"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Compass, Headphones, UserRound } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/UI/kit/Accordion";
import styles from "./home.module.css";

// Existing homepage FAQ answers, preserved without adding product claims.
const faqs = [
  { icon: BookOpen, subtitle: "مخاطبان سروا", question: "سروا برای چه کسانی است؟", answer: "برای دانش‌آموزان فارسی دهم، یازدهم و دوازدهم، دبیران ادبیات و هر کسی که به شعر و زبان فارسی علاقه دارد. می‌توانی از درسنامه و امتحان شروع کنی یا سراغ بازی‌ها و دنیای وزن شعر بروی." },
  { icon: Compass, subtitle: "اولین قدم", question: "از کدام بخش شروع کنم؟", answer: "برای مرور کتاب، درسنامه را باز کن و پایه‌ات را انتخاب کن. برای آمادگی امتحان، سراغ امتحانات نهایی برو. اگر هم دوست داری با تمرین کوتاه شروع کنی، بازی‌های ادبی یا عروض سماعی را انتخاب کن." },
  { icon: UserRound, subtitle: "حساب کاربری", question: "برای شروع باید حساب بسازم؟", answer: "برای دیدن درسنامه‌ها و آشنایی با ابزارها می‌توانی مهمان باشی. بعضی تمرین‌ها در حالت مهمان محدودند؛ برای ذخیرهٔ نتیجه‌ها و ادامهٔ مسیر در پنل شخصی، وارد حساب خودت شو." },
  { icon: Headphones, subtitle: "آشنایی با عروض", question: "برای یادگیری عروض باید از قبل چیزی بدانم؟", answer: "می‌توانی از راهنمای یادگیری شروع کنی، در وزن‌یاب با وزن و ارکان یک بیت آشنا شوی و بعد با تمرین‌های شنیداری، تشخیص ریتم شعر را تمرین کنی." },
];

export default function HomeFaq() {
  return (
    <section className={`container ${styles.faqSection}`} aria-labelledby="faq-title" dir="rtl">
      <div className={styles.faqIntro}>
        <span className={styles.kicker}>پیش از شروع</span>
        <h2 id="faq-title">شاید سؤال تو هم باشد</h2>
        <p>برای آشنایی بیشتر با بخش‌ها،<br />راهنمای سروا همراهت است.</p>
        <Link href="/guide" className={styles.textLink}>راهنمای یادگیری <ArrowLeft size={17} aria-hidden="true" /></Link>
      </div>
      <Accordion type="single" collapsible dir="rtl" className={styles.faqList}>
        {faqs.map(({ icon: Icon, subtitle, question, answer }, index) => (
          <AccordionItem key={question} value={`faq-${index}`} className={styles.faqItem}>
            <AccordionTrigger className={styles.faqTrigger}>
              <span className={styles.faqIcon}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span>
              <span className={styles.faqTitle}><span className={styles.faqSubtitle}>{subtitle}</span><span>{question}</span></span>
            </AccordionTrigger>
            <AccordionContent className={styles.faqAnswer}>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
