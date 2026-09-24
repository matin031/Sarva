import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import HeroSection from "@/components/UI/HeroSection";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import FeaturesSection from "@/components/UI/FeaturesSection";
import SupportersSection from "@/components/site/SupportersSection";
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
        <h2 id="start-title">از درسنامهٔ پایهٔ خودت شروع کن</h2>
        <div className={styles.closingActions}>
          {/* ⚠️ همان `ShinyButton`ِ هیرو. این دکمه و دکمهٔ هیرو دو سرِ یک
              صفحه‌اند و یک جمله را می‌گویند؛ وقتی یکی می‌درخشید و آن یکی
              نه، پایینِ صفحه شبیهِ نسخهٔ قدیمی‌ترِ بالای صفحه می‌شد. */}
          <ShinyButton asChild>
            <Link href="/doroos">رفتن به درسنامه <ArrowLeft size={18} aria-hidden="true" /></Link>
          </ShinyButton>
          <Link href="/game" className={styles.secondaryButton}>بازی‌ها <Gamepad2 size={18} aria-hidden="true" /></Link>
        </div>
      </section>
      <SupportersSection />
    </div>
  );
}
