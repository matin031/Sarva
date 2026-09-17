import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import HeroSection from "@/components/UI/HeroSection";
import FeaturesSection from "@/components/UI/FeaturesSection";
import SupportersSection from "@/components/site/SupportersSection";
import { Highlighter } from "./Highlighter";
import SarvaNetwork from "./SarvaNetwork";
import HomeDemos from "./HomeDemos";
import HomeFaq from "./HomeFaq";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.home} dir="rtl" data-homepage>
      <section className={`container ${styles.hero}`} aria-labelledby="home-title">
        <HeroSection />
      </section>
      <SarvaNetwork />
      <section className={`container ${styles.whySection}`} aria-labelledby="why-sarva-title">
        <FeaturesSection />
      </section>
      <HomeDemos />
      <HomeFaq />
      <section className={`container ${styles.closing}`} aria-labelledby="start-title">
        <span className={styles.kicker}>آغاز یک مسیر</span>
        <h2 id="start-title">یک بیت، یک بازی، <Highlighter action="highlight" color="color-mix(in srgb, var(--gold) 22%, transparent)">یک شروع تازه.</Highlighter></h2>
        <p>لازم نیست همه‌چیز را بدانی؛ از چیزی شروع کن که کنجکاوت می‌کند.</p>
        <div className={styles.closingActions}>
          <Link href="/doroos" className={styles.primaryButton}>از درسنامه شروع می‌کنم <ArrowLeft size={18} aria-hidden="true" /></Link>
          <Link href="/game" className={styles.secondaryButton}>با یک بازی شروع می‌کنم <Gamepad2 size={18} aria-hidden="true" /></Link>
        </div>
      </section>
      <SupportersSection />
    </div>
  );
}
