"use client";

import React, { useState } from "react";
import { PanelAudioPlayer } from "./PanelAudioPlayer";
import { toFa } from "./CircularProgress";
import type {
  Attempt,
  AttemptAnswer,
  AttemptQuestionOption,
} from "../CompletedQuizzesSection";

const AUDIO_OPTION_TYPES = [
  "poem-to-audio",
  "pattern-to-audio",
  "weight-to-audio",
];

function optionLines(opt?: AttemptQuestionOption): string[] {
  if (!opt) return ["—"];
  if (opt.poem && opt.poem.length) return opt.poem;
  if (opt.label) return [opt.label];
  return ["—"];
}

function PoemLines({ lines }: { lines: string[] }) {
  return (
    <div className="md:flex gap-x-1 text-xs min-[375px]:text-sm sm:text-base">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          <p className={i === 1 ? "text-left" : ""}>{line}</p>
          {i < lines.length - 1 && <span className="hidden md:inline">/</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

const XIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const CheckIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

function AnswerRow({ answer }: { answer: AttemptAnswer }) {
  const q = Array.isArray(answer.questions)
    ? answer.questions[0]
    : answer.questions;
  if (!q) return null;

  const opts: AttemptQuestionOption[] = q.question_options ?? [];
  const selectedOpt = opts.find((o) => o.id === answer.selected_option_id);
  const correctOpt = opts.find((o) => o.is_correct);
  const optionsAreAudio = AUDIO_OPTION_TYPES.includes(q.type);
  const userWasCorrect = answer.is_correct;

  return (
    <div className="w-full py-4 bg-secondary rounded-xl relative z-20 border-foreground px-3 sm:px-6">
      {/* prompt */}
      {optionsAreAudio ? (
        q.poem && q.poem.length ? (
          <div className="md:text-xl flex sm:flex-row flex-col text-sm min-[375px]:text-base gap-x-1">
            {q.poem.map((line: string, i: number) => (
              <React.Fragment key={i}>
                <p className={i === 1 ? "text-left" : ""}>{line}</p>
                {i < q.poem!.length - 1 && (
                  <span className="hidden sm:inline">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">صورت پرسش</p>
        )
      ) : (
        <div className="flex text-xl gap-x-1">
          <PanelAudioPlayer audioSrc={q.audio_url || ""} color="main" />
        </div>
      )}

      {/* user answer vs correct answer */}
      <div className="flex sm:flex-row flex-col gap-y-6 items-center w-full mt-5">
        {/* your answer */}
        <div className="w-full">
          <div className="flex items-center gap-x-2">
            <div className={userWasCorrect ? "text-green-500" : "text-red-600"}>
              {userWasCorrect ? CheckIcon : XIcon}
            </div>
            پاسخ شما:
          </div>
          <div className="pr-4 sm:pr-6 md:pr-8 pt-3 w-full">
            {!selectedOpt ? (
              <p className="text-muted-foreground text-sm">پاسخی ثبت نشده</p>
            ) : optionsAreAudio ? (
              selectedOpt.audio_url ? (
                <PanelAudioPlayer
                  audioSrc={selectedOpt.audio_url}
                  color={userWasCorrect ? "green" : "red"}
                />
              ) : (
                <p className="text-muted-foreground text-sm">پاسخی ثبت نشده</p>
              )
            ) : (
              <PoemLines lines={optionLines(selectedOpt)} />
            )}
          </div>
        </div>

        {/* correct answer */}
        <div className="w-full">
          <div className="flex items-center gap-x-2">
            <div className="text-green-500">{CheckIcon}</div>
            پاسخ درست:
          </div>
          <div className="pr-4 sm:pr-6 md:pr-8 pt-3 w-full">
            {optionsAreAudio ? (
              correctOpt?.audio_url ? (
                <PanelAudioPlayer
                  audioSrc={correctOpt.audio_url}
                  color="green"
                />
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )
            ) : (
              <PoemLines lines={optionLines(correctOpt)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAnswerItem({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);

  const answers = attempt.quiz_attempt_answers ?? [];
  const total = attempt.total || 0;
  const correct = attempt.correct || 0;
  const wrong = Math.max(total - correct, 0);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= 50;

  return (
    <div dir="rtl" className="w-full rounded-xl">
      <div
        onClick={() => setOpen((prev) => !prev)}
        className={`glass border ${open ? " rounded-b-none" : ""} rounded-lg brightness-90 hover:brightness-100
            w-full flex items-center p-1.5 py-3 min-[375px]:p-3 sm:p-6 justify-between cursor-pointer`}
      >
        <div className="flex items-center gap-x-3">
          <div
            className={`size-10 text-sm sm:text-base sm:size-12 rounded-full flex
            items-center justify-center font-semibold cursor-default ${
              passed
                ? "bg-green-500/20! text-green-500"
                : "bg-red-500/20! text-red-500"
            }`}
          >
            {toFa(percent)}%
          </div>
          <div>
            <p className="cursor-default text-sm sm:text-base">
              {toFa(correct)} از {toFa(total)} پاسخ درست
            </p>
            <div className="cursor-default flex items-center gap-x-1 text-foreground/60">
              <div className="size-4 mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-full"
                >
                  <path d="M5.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75V12ZM6 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H6ZM7.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H8a.75.75 0 0 1-.75-.75V12ZM8 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H8ZM9.25 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V10ZM10 11.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H10ZM9.25 14a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H10a.75.75 0 0 1-.75-.75V14ZM12 9.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V10a.75.75 0 0 0-.75-.75H12ZM11.25 12a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H12a.75.75 0 0 1-.75-.75V12ZM12 13.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75H12ZM13.25 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-.75.75H14a.75.75 0 0 1-.75-.75V10ZM14 11.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H14Z" />
                  <path
                    fillRule="evenodd"
                    d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs">{toFa(attempt.formattedDate)}</p>
            </div>
          </div>
        </div>
        <div className="gap-x-2 flex items-center text-foreground/60">
          {wrong > 0 && (
            <div className="text-red-600 text-sm sm:text-base cursor-default">
              <div>{toFa(wrong)} نادرست</div>
            </div>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`sm:size-4.5 size-4 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>

      <div
        className={`${open ? "block" : "hidden"} border-t-0 space-y-7 glass p-3 sm:p-6`}
      >
        {answers.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            جزئیات پاسخ‌ها موجود نیست.
          </p>
        ) : (
          answers.map((answer) => <AnswerRow key={answer.id} answer={answer} />)
        )}
      </div>
    </div>
  );
}

export default UserAnswerItem;
