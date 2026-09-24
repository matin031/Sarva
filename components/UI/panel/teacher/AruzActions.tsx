"use client";

import { useMemo, useState, useTransition } from "react";
import { Sheet, SheetContent } from "@/components/UI/kit/sheet";
import { Button } from "@/components/UI/kit/button";
import { fa } from "@/lib/panel/format";
import {
  teacherCreateGameAssignment,
  teacherCreateQuizAssignment,
} from "@/lib/teacher/assignment-actions";
import {
  BRIDGE_COUNTS,
  QUIZ_MAX_PER_WEIGHT,
  QUIZ_MAX_TOTAL,
  RAPID_MAX,
  type WeightAvailability,
} from "@/lib/teacher/assignment-rules";

/**
 * چهار کارِ دبیر روی عروضِ یک دانش‌آموز، هر کدام در یک کشو.
 *
 * ⚠️ هیچ قاعده‌ای اینجا اجرا نمی‌شود؛ سرور همه را دوباره می‌سنجد (کمبودِ
 * سؤالِ دیده‌نشده، مالکیتِ کلاس، سقف‌ها). عددهای این فرم فقط برای این‌اند
 * که دبیر پیش از ارسال بداند چه چیزی شدنی است.
 */

type Panel = "weights" | "mistakes" | "rapid" | "bridge" | null;

const TITLES: Record<Exclude<Panel, null>, string> = {
  weights: "ساخت آزمون عروض",
  mistakes: "آزمون از پاسخ‌های غلط",
  rapid: "تکلیف «کوتاه یا بلند؟»",
  bridge: "تکلیف «پل وزن»",
};

export default function AruzActions({
  studentId,
  classId,
  weights,
  mistakes,
}: {
  studentId: string;
  classId: string;
  weights: WeightAvailability[];
  mistakes: number;
}) {
  const [open, setOpen] = useState<Panel>(null);
  const [done, setDone] = useState<string | null>(null);

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setOpen("weights")}>
          ساخت آزمون عروض
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen("mistakes")}
          disabled={mistakes === 0}
          title={mistakes === 0 ? "سؤال غلطی برای تمرین نیست" : undefined}
        >
          آزمون از غلط‌ها{mistakes > 0 && ` (${fa(mistakes)})`}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("rapid")}>
          تکلیف کوتاه یا بلند
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("bridge")}>
          تکلیف پل وزن
        </Button>
      </div>

      {done && (
        <p role="status" className="text-[12.5px] text-primary">
          {done}
        </p>
      )}

      <Sheet open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent
          title={open ? TITLES[open] : ""}
          className="w-[28rem] max-w-[92vw] overflow-y-auto p-5 pt-12"
        >
          {open && (
            <h2 aria-hidden className="mb-4 text-base font-bold">
              {TITLES[open]}
            </h2>
          )}
          {open === "weights" && (
            <WeightsForm studentId={studentId} classId={classId} weights={weights} onDone={finish} />
          )}
          {open === "mistakes" && (
            <MistakesForm studentId={studentId} classId={classId} mistakes={mistakes} onDone={finish} />
          )}
          {open === "rapid" && (
            <GameForm
              studentId={studentId}
              classId={classId}
              kind="aruz_rapid"
              counts={Array.from({ length: RAPID_MAX }, (_, i) => i + 1)}
              initial={5}
              unit="مصراع"
              hint="دانش‌آموز هر مصراع را هجا به هجا تقطیع می‌کند. درستی را خودِ بازی می‌سنجد."
              onDone={finish}
            />
          )}
          {open === "bridge" && (
            <GameForm
              studentId={studentId}
              classId={classId}
              kind="aruz_bridge"
              counts={[...BRIDGE_COUNTS]}
              initial={20}
              unit="سؤال"
              hint="یک دست با همین تعداد سؤال. بازی با اولین اشتباه تمام می‌شود و همان دست ثبت می‌شود."
              onDone={finish}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ──────────────────────────── فرم‌ها ──────────────────────────────────── */

function Errors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[12.5px]">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : min;
}

function WeightsForm({
  studentId,
  classId,
  weights,
  onDone,
}: {
  studentId: string;
  classId: string;
  weights: WeightAvailability[];
  onDone: (message: string) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [excludeSeen, setExcludeSeen] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const submit = () => {
    setErrors([]);
    start(async () => {
      const r = await teacherCreateQuizAssignment({
        studentId,
        classId,
        request: { source: "weights", weights: counts, excludeSeen },
      });
      if (r.ok) onDone(`آزمون ${fa(total)} سؤالی ثبت و برای دانش‌آموز اعلان شد.`);
      else setErrors(r.errors);
    });
  };

  if (weights.length === 0) {
    return <p className="text-[13px] text-muted-foreground">بانک سؤال عروض سماعی هنوز سؤالی با وزن مشخص ندارد.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] text-muted-foreground">
        از هر وزن چند سؤال؟ سؤال‌ها را سرور از بانک انتخاب می‌کند.
      </p>

      <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-[13px]">
        <input
          type="checkbox"
          checked={excludeSeen}
          onChange={(e) => setExcludeSeen(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--color-primary)]"
        />
        <span>سؤال‌هایی که این دانش‌آموز قبلاً دیده است تکرار نشوند</span>
      </label>

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {weights.map((w) => {
          const cap = Math.min(QUIZ_MAX_PER_WEIGHT, excludeSeen ? w.unseen : w.total);
          const value = counts[w.weight] ?? 0;
          return (
            <li key={w.weight} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{w.weight}</span>
                <span className="panel-num text-[11px] text-muted-foreground">
                  {excludeSeen ? `${fa(w.unseen)} دیده‌نشده از ${fa(w.total)}` : `${fa(w.total)} سؤال`}
                </span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={QUIZ_MAX_PER_WEIGHT}
                value={value === 0 ? "" : value}
                placeholder="۰"
                aria-label={`تعداد سؤال از ${w.weight}`}
                onChange={(e) =>
                  setCounts((c) => ({
                    ...c,
                    [w.weight]: clamp(Number(e.target.value), 0, QUIZ_MAX_PER_WEIGHT),
                  }))
                }
                className={`panel-num h-9 w-16 shrink-0 rounded-lg border bg-transparent text-center text-[13px] outline-none focus:border-primary ${
                  value > cap ? "border-destructive" : "border-border"
                }`}
              />
            </li>
          );
        })}
      </ul>

      {/* فهرستِ وزن‌ها بلند است؛ جمع، خطا و دکمه همیشه دیده می‌شوند. */}
      <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 border-t border-border bg-background px-5 pt-3 pb-5">
        <Errors errors={errors} />
        <div className="flex items-center justify-between gap-3">
          <span className="panel-num text-[12.5px] text-muted-foreground">
            جمع: {fa(total)} از حداکثر {fa(QUIZ_MAX_TOTAL)}
          </span>
          <Button onClick={submit} disabled={pending || total === 0 || total > QUIZ_MAX_TOTAL}>
            {pending ? "در حال ثبت…" : "ثبت آزمون"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MistakesForm({
  studentId,
  classId,
  mistakes,
  onDone,
}: {
  studentId: string;
  classId: string;
  mistakes: number;
  onDone: (message: string) => void;
}) {
  const max = Math.min(mistakes, QUIZ_MAX_TOTAL);
  const [count, setCount] = useState(Math.min(max, 20));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const submit = () => {
    setErrors([]);
    start(async () => {
      const r = await teacherCreateQuizAssignment({
        studentId,
        classId,
        request: { source: "mistakes", count },
      });
      if (r.ok) onDone(`آزمون ${fa(count)} سؤالی از غلط‌ها ثبت و اعلان شد.`);
      else setErrors(r.errors);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px]">
        آخرین پاسخ این دانش‌آموز به{" "}
        <strong className="panel-num">{fa(mistakes)}</strong> سؤال عروض سماعی غلط بوده است.
      </p>
      <p className="text-[12.5px] text-muted-foreground">
        تازه‌ترین غلط‌ها اول انتخاب می‌شوند. سؤالی که بعداً درست جواب داده شود از این فهرست بیرون می‌رود.
      </p>

      <label className="flex items-center justify-between gap-3 text-[13px]">
        تعداد سؤال
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={count}
          onChange={(e) => setCount(clamp(Number(e.target.value), 1, max))}
          className="panel-num h-9 w-20 rounded-lg border border-border bg-transparent text-center outline-none focus:border-primary"
        />
      </label>

      <Errors errors={errors} />

      <Button onClick={submit} disabled={pending || max === 0}>
        {pending ? "در حال ثبت…" : "ثبت آزمون"}
      </Button>
    </div>
  );
}

function GameForm({
  studentId,
  classId,
  kind,
  counts,
  initial,
  unit,
  hint,
  onDone,
}: {
  studentId: string;
  classId: string;
  kind: "aruz_rapid" | "aruz_bridge";
  counts: number[];
  initial: number;
  unit: string;
  hint: string;
  onDone: (message: string) => void;
}) {
  const [count, setCount] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const submit = () => {
    setErrors([]);
    start(async () => {
      const r = await teacherCreateGameAssignment({ studentId, classId, kind, count });
      if (r.ok) onDone("تکلیف ثبت و برای دانش‌آموز اعلان شد.");
      else setErrors(r.errors);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] text-muted-foreground">{hint}</p>

      <div role="radiogroup" aria-label={`تعداد ${unit}`} className="flex flex-wrap gap-1.5">
        {counts.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            onClick={() => setCount(n)}
            className={`panel-num min-w-11 rounded-xl border px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              count === n
                ? "border-primary bg-primary/10 font-bold text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {fa(n)}
          </button>
        ))}
      </div>

      <Errors errors={errors} />

      <Button onClick={submit} disabled={pending}>
        {pending ? "در حال ثبت…" : `ثبت تکلیف · ${fa(count)} ${unit}`}
      </Button>
    </div>
  );
}
