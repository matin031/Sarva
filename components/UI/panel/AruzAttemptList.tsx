"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PanelAudioPlayer } from "@/components/UI/PanelAudioPlayer";
import {
  ARUZ_TYPE_LABEL,
  AUDIO_OPTION_TYPES,
  type AruzAnswer,
  type AruzAttempt,
  type AruzOption,
  type AruzQuestionType,
} from "@/lib/panel/types";
import { clock, fa, jalaliLong, pct, relativeDay } from "@/lib/panel/format";

const EASE = [0.16, 1, 0.3, 1] as const;

function Beyt({ lines }: { lines: string[] }) {
  return (
    <p className="font-serif text-base leading-loose text-foreground">
      {lines.join(" / ")}
    </p>
  );
}

function optionText(o?: AruzOption): string {
  if (!o) return "—";
  if (o.poem?.length) return o.poem.join(" / ");
  if (o.label) return o.label;
  return "—";
}

/** One reviewed question: the prompt as the student saw it, then their answer
 *  and the right one — as audio when the options were audio, which is the whole
 *  point of reviewing an ear-training test. */
function QuestionReview({ answer, n }: { answer: AruzAnswer; n: number }) {
  const audioOptions = AUDIO_OPTION_TYPES.includes(answer.type ?? "");
  const chosen = answer.options.find((o) => o.id === answer.selectedOptionId);
  const right = answer.options.find((o) => o.isCorrect);

  return (
    <li className="border-t border-border/70 py-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
            answer.isCorrect
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {answer.isCorrect ? "✓" : "✕"}
        </span>
        <span className="text-xs text-muted-foreground">سؤال {fa(n)}</span>
      </div>

      {/* the prompt */}
      {audioOptions ? (
        answer.poem?.length ? (
          <Beyt lines={answer.poem} />
        ) : (
          <p className="text-sm text-muted-foreground">صورتِ پرسش</p>
        )
      ) : answer.audioUrl ? (
        <PanelAudioPlayer audioSrc={answer.audioUrl} color="main" />
      ) : (
        <p className="text-sm text-muted-foreground">صورتِ پرسش</p>
      )}

      {/* answers */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">پاسخِ تو</p>
          {!chosen ? (
            <p className="text-sm text-muted-foreground">پاسخی ثبت نشده</p>
          ) : audioOptions ? (
            chosen.audioUrl ? (
              <PanelAudioPlayer
                audioSrc={chosen.audioUrl}
                color={answer.isCorrect ? "green" : "red"}
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )
          ) : (
            <p
              className={`text-sm leading-relaxed ${
                answer.isCorrect
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
              }`}
            >
              {optionText(chosen)}
            </p>
          )}
        </div>

        {/* only worth showing when they got it wrong */}
        {!answer.isCorrect && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">پاسخِ درست</p>
            {audioOptions ? (
              right?.audioUrl ? (
                <PanelAudioPlayer audioSrc={right.audioUrl} color="green" />
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )
            ) : (
              <p className="text-sm leading-relaxed text-green-600 dark:text-green-400">
                {optionText(right)}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Past عروض attempts; each expands into its questions. */
export default function AruzAttemptList({
  attempts,
}: {
  attempts: AruzAttempt[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {attempts.map((a) => {
        const open = openId === a.id;
        return (
          <li key={a.id}>
            <button
              onClick={() => setOpenId(open ? null : a.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-4 p-4 text-right transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {relativeDay(a.createdAt)}
                  <span className="ms-2 text-xs font-normal text-muted-foreground">
                    {jalaliLong(a.createdAt)} · {clock(a.createdAt)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fa(a.correct)} از {fa(a.total)} درست · {pct(a.correct, a.total)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {open ? "بستن" : "دیدن سؤال‌ها"}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border bg-background/40 px-4 pb-5">
                    {a.answers.length === 0 ? (
                      <p className="py-5 text-sm text-muted-foreground">
                        ریزِ سؤال‌های این آزمون ذخیره نشده است.
                      </p>
                    ) : (
                      <ul className="pt-5">
                        {a.answers.map((ans, i) => (
                          <QuestionReview key={ans.id} answer={ans} n={i + 1} />
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

export { ARUZ_TYPE_LABEL, type AruzQuestionType };
