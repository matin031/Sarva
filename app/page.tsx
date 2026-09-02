import ExamSection from "@/components/UI/ExamSection";
import VaznYabHomeSection from "@/components/UI/VaznYabHomeSection";
import VocabHomeSection from "@/components/UI/VocabHomeSection";
import OrouzHomeSection from "@/components/UI/OrouzHomeSection";
import FeaturesSection from "@/components/UI/FeaturesSection";
import HeroSection from "@/components/UI/HeroSection";
import LearningProcessSection from "@/components/UI/LearningProcessSection";
import SiteHighlightsSection from "@/components/UI/SiteHighlightsSection";
import StartLearningSection from "@/components/UI/StartLearningSection";
import VerseCard from "@/components/UI/WaveDivider";
import SupportersSection from "@/components/site/SupportersSection";

export default function Home() {
  return (
    <div className="relative bg-background overflow-hidden">
      <main className=" pb-22 space-y-30">
        <section
          className="container text-center flex items-center justify-center flex-col px-6  
        md:px-12 lg:px-20 py-14 relative"
        >
          <div
            aria-hidden
            className="glow-soft absolute bottom-0 right-20 hidden size-100 rounded-full dark:block"
            style={{ "--glow": "color-mix(in oklch, var(--color-primary) 14%, transparent)" } as React.CSSProperties}
          />
          <HeroSection />
        </section>
        <section className="container pb-24">
          <VerseCard />
        </section>
        <section className="container">
          <FeaturesSection />
        </section>
        <section className=" container relative">
          <VaznYabHomeSection />
        </section>
        <section className=" container  relative">
          <ExamSection />
        </section>
        <section className=" container relative pb-22">
          <VocabHomeSection />
        </section>
        <section className=" container relative pb-22">
          <OrouzHomeSection />
        </section>
        {/* تمام‌عرض و بیرون از container: هالهٔ پس‌زمینه و نوارِ حامیان باید
            تا لبهٔ صفحه بروند. اگر هیچ حامیِ قابلِ نمایشی نباشد — یا بخش از
            پنل خاموش باشد — خودِ کامپوننت هیچ چیزی رندر نمی‌کند. */}
        <SupportersSection />
      </main>
    </div>
  );
}
