"use client";
import { Question } from "@/app/quiz/page";
import QuizHeader from "@/components/UI/QuizHeader";
import { useEffect, useState } from "react";
import QuestionCard from "./QuestionCard";
import QuestionOption from "@/components/UI/QuestionOption";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Quiz({ data }: { data: Question[] }) {
  const [questions] = useState<Question[]>(data);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const handleSubmit = () => {
    if (selected === null) return;

    const isCorrect = questions[currentIndex].options[selected].isCorrect;

    if (isCorrect) {
      setScore((s) => s + 1);
    }
    setAnswered(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      localStorage.removeItem("quiz-progress");
      setPhase("result");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("quiz-progress");

    if (saved) {
      const data = JSON.parse(saved);
      setCurrentIndex(data.currentIndex);
      setSelected(data.selected);
      setAnswered(data.answered);
      setScore(data.score);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "quiz-progress",
      JSON.stringify({ currentIndex, selected, answered, score }),
    );
  }, [currentIndex, selected, answered, score]);

  return (
    <div className=" container my-15 max-w-4xl mx-auto">
      <QuizHeader
        score={score}
        currentIndex={currentIndex}
        questionsLength={questions.length}
      />
      <div className="  w-full">
        <QuestionCard questions={questions} currentIndex={currentIndex} />

        {/* QuestionOptions */}
        <div
          className=" grid grid-cols-1 sm:grid-cols-2 gap-4 *:h-20 md:*:min-h-30
         text-muted-foreground"
        >
          {questions[currentIndex].options.map((o, index) => (
            <QuestionOption
              key={`${currentIndex}-${o.id}`}
              setSelected={setSelected}
              selected={selected}
              id={index}
              audioUrl={o.audioSrc || ""}
              answered={answered}
              isCorrect={o.isCorrect}
              title={o.label}
              quizType={questions[currentIndex].type}
              poem={o.poem}
              whileInView={o.x}
            />
          ))}
        </div>
        {/* QuestionOptions */}

        {/* submit answer */}
        <div className=" w-full items-center justify-center flex">
          <button
            onClick={answered ? handleNext : handleSubmit}
            className={` mt-6 transition-all whitespace-nowrap text-sm md:text-lg 
  text-primary-foreground h-9 rounded-lg md:rounded-xl px-5 md:px-8 py-3 md:py-6 
  inline-flex items-center justify-center font-medium ${
    answered || selected !== null
      ? "bg-primary xs:hover:brightness-90"
      : "bg-primary/50 cursor-not-allowed!"
  }`}
          >
            {currentIndex + 1 == questions.length &&
              (answered ? (
                <Link href={`/result?score=${score}&total=${questions.length}`}>
                  مشاهده نتیجه
                </Link>
              ) : (
                "ثبت پاسخ"
              ))}
            {currentIndex + 1 !== questions.length &&
              (!answered ? "ثبت پاسخ" : "سوال بعدی")}
          </button>
        </div>
        {/* submit answer */}
      </div>
    </div>
  );
}

export default Quiz;
