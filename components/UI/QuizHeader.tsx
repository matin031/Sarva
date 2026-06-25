interface QuizHeaderType {
  score: number;
  currentIndex: number;
  questionsLength: number;
}

function QuizHeader({ score, currentIndex, questionsLength }: QuizHeaderType) {
  return (
    <div dir="rtl" className=" w-full">
      {/* ProgressBar  */}
      <div className=" text-xs sm:text-sm flex justify-between items-center w-full">
        <span>پیشرفت</span>
        <span className=" text-primary">{score} پاسخ صحیح</span>
      </div>
      <div className=" mt-2 rounded-full h-2 bg-muted overflow-hidden w-full">
        <div
          style={{
            width: `${Math.round(((currentIndex + 1) / questionsLength) * 100)}%`,
          }}
          className="h-full bg-linear-to-l from-primary transition-all to-turquoise-light"
        ></div>
      </div>
      {/* ProgressBar  */}

      {/* QuestionCounter  */}
      <span className=" mt-10 block text-xs sm:text-sm text-muted-foreground">
        پرسش{currentIndex + 1} از {questionsLength}
      </span>
      {/* QuestionCounter  */}
    </div>
  );
}

export default QuizHeader;
