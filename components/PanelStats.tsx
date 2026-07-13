"use client";

import CircularProgress, { toFa } from "./UI/CircularProgress";

function PanelStats({
  total,
  correct,
  wrong,
}: {
  total: number;
  correct: number;
  wrong: number;
}) {
  return (
    <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
      <div className="border-3 h-39 sm:h-auto  overflow-hidden relative z-20 border-primary/60 rounded-xl">
        <div className="glass size-full py-3 px-3 sm:px-5 flex items-center gap-x-3 sm:gap-x-6">
          <div className=" flex items-center justify-center max-w-50 max-h-50">
            <CircularProgress
              isPanel={true}
              size={100}
              total={total}
              correct={correct}
            />
          </div>

          <div
            className=" flex flex-col items-start text-muted-foreground
           gap-6 justify-center h-full text-xs xs:text-sm"
          >
            <span>درصد پاسخ‌های درست</span>
            <span>
              {toFa(correct)} از {toFa(total)} پاسخ درست
            </span>
          </div>
        </div>
      </div>
      <div className="border-3 h-39 sm:h-auto overflow-hidden relative z-20 border-primary/60 rounded-xl">
        <div
          className="glass relative z-20 size-full flex flex-col 
        items-center sm:items-start py-3 px-3 sm:px-5"
        >
          <span className=" text-4xl sm:text-5xl font-bold">{toFa(total)}</span>
          <span className=" text-sm sm:text-base">سوال حل‌شده</span>
          <div className=" text-sm text-muted-foreground">
            <span>{toFa(correct)} درست</span> |{" "}
            <span>{toFa(wrong)} نادرست</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanelStats;
