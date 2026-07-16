import { Question } from "@/app/quiz/page";
import CircularVisualizer from "./CircularVisualizer";

function QuestionCard({
  questions,
  currentIndex,
}: {
  questions: Question[];
  currentIndex: number;
}) {
  return (
    <div
      className="glass h-62.5 rounded-2xl py-3 xs:p-5 md:px-8 md:py-5 mb-6  overflow-hidden relative z-20
             mt-4 flex items-center justify-center flex-col text-base xs:text-lg sm:text-xl md:text-2xl"
    >
      {/* نمایش بیت شعر */}
      {questions[currentIndex].type == "poem-to-audio" && (
        <>
          <p>وزن عروضی این بیت کدام است؟</p>
          {questions[currentIndex].poem?.map((i) => (
            <p
              key={i}
              className=" text-sm xs:text-base sm:text-lg  md:text-xl text-muted-foreground"
            >
              {i}
            </p>
          ))}
        </>
      )}

      {/* پخش وزن */}
      {questions[currentIndex].type == "audio-to-poem" && (
        <>
          <p className="">کدام وزن با ریتم پخش‌ شده مطابقت دارد؟</p>
          <CircularVisualizer
            audioSrc={questions[currentIndex].audioSrc || ""}
          />
        </>
      )}
      {questions[currentIndex].type == "audio-to-weight" && (
        <>
          <p>کدام وزن با ریتم پخش‌ شده مطابقت دارد؟</p>
          <CircularVisualizer
            audioSrc={questions[currentIndex].audioSrc || ""}
          />
        </>
      )}

      {/* نمایش الگوی هجایی */}
      {questions[currentIndex].type == "pattern-to-audio" && (
        <>
          <p>با توجه به الگوی هجایی، گزینهٔ صحیح را انتخاب کنید.</p>
          <div className=" flex items-center gap-x-2">
            <div className=" flex items-center gap-x-1">
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
            </div>
            /
            <div className=" flex items-center gap-x-1">
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
            </div>
            /
            <div className=" flex items-center gap-x-1">
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
            </div>
            /
            <div className=" flex items-center gap-x-1">
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-secondary text-secondary-foreground border border-border"
              >
                ∪
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
              <span
                className="
                  size-8 rounded-full flex items-center justify-center text-base font-mono
                  bg-primary text-primary-foreground"
              >
                <span className=" h-0.5 w-2/5 bg-black block"></span>
              </span>
            </div>
          </div>
        </>
      )}

      {/* نمایش وزن */}
      {questions[currentIndex].type == "weight-to-audio" && (
        <>
          <p>ریتم مناسب این وزن کدام است؟</p>
          <p className=" text-muted-foreground">
            {questions[currentIndex].poem?.[0]}
          </p>
        </>
      )}

      <div className=" absolute h-1 w-full top-0 left-0 bg-linear-to-r from-transparent via-primary/50 to-transparent"></div>
      <div className=" absolute h-1 w-full bottom-0 left-0 bg-linear-to-r from-transparent via-gold/50 to-transparent"></div>
    </div>
  );
}

export default QuestionCard;
