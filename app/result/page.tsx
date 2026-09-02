import CircularProgress from "@/components/UI/CircularProgress";
import RegisterPrompt from "@/components/UI/RegisterPrompt";
import ResultHero from "@/components/UI/ResultHero";
import ScoreStats from "@/components/UI/ScoreStats";
import StarsIcon from "@/components/UI/StarsIcon";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نتیجه آزمون",
  robots: { index: false, follow: false },
};

async function page({
  searchParams,
}: {
  searchParams: Promise<{ score: number; total: number }>;
}) {
  const { score, total } = await searchParams;

  return (
    <div className=" mb-20  flex max-w-2xl mx-auto container items-center justify-center flex-col mt-10 relative">
<div
        aria-hidden
        className="glow-soft absolute right-20 top-0 hidden size-100 rounded-full dark:block"
        style={{ "--glow": "color-mix(in oklch, var(--color-primary) 14%, transparent)" } as React.CSSProperties}
      />

      {/* stars */}
      <StarsIcon />
      {/* stars */}

      <div
        className=" w-full mt-9 text-center relative glass z-20 rounded-xl 
     p-6 sm:p-12 flex items-center flex-col"
      >
        <div className=" mb-8 w-full">
          <svg
            className="w-full h-4"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 400 16"
          >
            <defs>
              <linearGradient
                id="border-gradient"
                x1="0%"
                x2="100%"
                y1="0%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="var(--turquoise)"
                  stopOpacity="0"
                ></stop>
                <stop offset="30%" stopColor="var(--turquoise)"></stop>
                <stop offset="50%" stopColor="var(--gold)"></stop>
                <stop offset="70%" stopColor="var(--turquoise)"></stop>
                <stop
                  offset="100%"
                  stopColor="var(--turquoise)"
                  stopOpacity="0"
                ></stop>
              </linearGradient>
            </defs>
            <path
              fill="none"
              stroke="url(#border-gradient)"
              strokeWidth="1.5"
              d="M0 8q50-6 100 0t100 0 100 0 100 0"
            ></path>
            <circle cx="200" cy="8" r="3" fill="var(--gold)"></circle>
            <circle cx="100" cy="8" r="2" fill="var(--turquoise)"></circle>
            <circle cx="300" cy="8" r="2" fill="var(--turquoise)"></circle>
          </svg>
        </div>
        <ResultHero total={Number(total)} correct={Number(score)} />

        <CircularProgress total={Number(total)} correct={Number(score)} />

        <ScoreStats total={total} score={score} />

        {/* wave */}
        <div className=" mt-8 w-full">
          <svg
            className="w-full h-4"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 400 16"
          >
            <defs>
              <linearGradient
                id="border-gradient"
                x1="0%"
                x2="100%"
                y1="0%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="var(--turquoise)"
                  stopOpacity="0"
                ></stop>
                <stop offset="30%" stopColor="var(--turquoise)"></stop>
                <stop offset="50%" stopColor="var(--gold)"></stop>
                <stop offset="70%" stopColor="var(--turquoise)"></stop>
                <stop
                  offset="100%"
                  stopColor="var(--turquoise)"
                  stopOpacity="0"
                ></stop>
              </linearGradient>
            </defs>
            <path
              fill="none"
              stroke="url(#border-gradient)"
              strokeWidth="1.5"
              d="M0 8q50-6 100 0t100 0 100 0 100 0"
            ></path>
            <circle cx="200" cy="8" r="3" fill="var(--gold)"></circle>
            <circle cx="100" cy="8" r="2" fill="var(--turquoise)"></circle>
            <circle cx="300" cy="8" r="2" fill="var(--turquoise)"></circle>
          </svg>
        </div>
        {/* wave */}
      </div>
      <Link className=" underline mt-4" href={"/"}>
        بازگشت به صفحه اصلی
      </Link>

      <RegisterPrompt />
    </div>
  );
}

export default page;
