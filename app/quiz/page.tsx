import Quiz from "@/components/UI/Quiz";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "آزمون وزن شعر",
  robots: { index: false, follow: false },
};

async function page() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data: questions } = await supabase.from("questions").select(`
      id,
      type,
      poem,
      audio_url,
      question_options (
        id,
        label,
        poem,
        audio_url,
        is_correct,
        x
      )
    `);

  const data = (questions ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    poem: q.poem,
    audioSrc: q.audio_url,
    options: q.question_options.map((o: any) => ({
      id: o.id,
      label: o.label,
      poem: o.poem,
      audioSrc: o.audio_url,
      isCorrect: o.is_correct,
      x: o.x,
    })),
  }));

  return <Quiz data={data} />;
}

export type Question = {
  id: string;
  type:
    | "audio-to-poem"
    | "audio-to-pattern"
    | "poem-to-audio"
    | "pattern-to-audio"
    | "audio-to-weight"
    | "weight-to-audio";
  poem?: string[];
  audioSrc?: string;
  options: {
    id: string;
    poem?: string[];
    label?: string;
    audioSrc?: string;
    isCorrect: boolean;
    x: number;
  }[];
};

export default page;
