import { GeometricPattern } from "@/components/persian-patterns";
import FeaturesSection from "@/components/UI/FeaturesSection";
import HeroSection from "@/components/UI/HeroSection";
import LearningProcessSection from "@/components/UI/LearningProcessSection";
import StartLearningSection from "@/components/UI/StartLearningSection";
import VerseCard from "@/components/UI/WaveDivider";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative bg-background">
      <main
        className=" pb-22
      "
      >
        <section
          className="container text-center flex items-center justify-center flex-col px-6  
        md:px-12 lg:px-20 py-14 relative"
        >
          <div className="hidden dark:block  bg-primary/8 blur-3xl size-100 rounded-full right-20 bottom-0 absolute"></div>
          <HeroSection />
        </section>
        <section className="container pb-24">
          <VerseCard />
        </section>
        <section className="container">
          <FeaturesSection />
        </section>
        <section>
          <LearningProcessSection />
        </section>
        <section className=" container">
          <StartLearningSection />
        </section>
      </main>
    </div>
  );
}
