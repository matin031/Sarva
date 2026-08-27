import type { RapidAruzQuestion, RapidAruzUnit, ScansionLength } from "./types";

/**
 * اعتبارسنجیِ سؤال — پیش از آن‌که چیزی به دانش‌آموز نشان داده شود.
 *
 * سؤالِ خراب نباید وارد بازی شود. در توسعه خطا با جزئیات چاپ می‌شود تا
 * بشود دیباگش کرد؛ در production فقط همان سؤال کنار گذاشته می‌شود و بازی
 * سر پا می‌ماند.
 */

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** ایراد نیست ولی احتمالاً اشتباهِ نویسندهٔ داده است. جلوی بازی را نمی‌گیرد. */
  warnings: ValidationIssue[];
}

const LENGTHS: ReadonlySet<string> = new Set<ScansionLength>(["short", "long"]);
// فعلاً فقط مصراع. «واژه» و «ترکیب» از محصول برداشته شدند.
const TYPES: ReadonlySet<string> = new Set(["hemistich"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** فاصله، نیم‌فاصله و علائمِ جداکننده — فقط برای مقایسهٔ هشدارگونهٔ متن. */
function stripSeparators(s: string): string {
  return s.replace(/[\s‌‏‎]/g, "");
}

function validateUnit(
  unit: unknown,
  index: number,
  seenIds: Set<string>,
  issues: ValidationIssue[],
): void {
  const path = `units[${index}]`;
  if (typeof unit !== "object" || unit === null) {
    issues.push({ code: "unit_not_object", message: "واحد باید یک شیء باشد.", path });
    return;
  }
  const u = unit as Partial<RapidAruzUnit>;

  if (!isNonEmptyString(u.id)) {
    issues.push({ code: "unit_id_empty", message: "شناسهٔ واحد خالی است.", path: `${path}.id` });
  } else if (seenIds.has(u.id)) {
    issues.push({
      code: "unit_id_duplicate",
      message: `شناسهٔ واحد تکراری است: ${u.id}`,
      path: `${path}.id`,
    });
  } else {
    seenIds.add(u.id);
  }

  // display عمداً trim نمی‌شود: متن باید عیناً همان چیزی بماند که داده داده.
  if (typeof u.display !== "string" || u.display.length === 0) {
    issues.push({
      code: "unit_display_empty",
      message: "متنِ نمایشیِ واحد خالی است.",
      path: `${path}.display`,
    });
  }

  if (typeof u.length !== "string" || !LENGTHS.has(u.length)) {
    issues.push({
      code: "unit_length_invalid",
      message: `کمیتِ واحد باید short یا long باشد، نه ${JSON.stringify(u.length)}.`,
      path: `${path}.length`,
    });
  }

  if (u.revealProgress !== undefined) {
    if (typeof u.revealProgress !== "number" || !Number.isFinite(u.revealProgress)) {
      issues.push({
        code: "reveal_not_finite",
        message: "revealProgress باید عددِ متناهی باشد.",
        path: `${path}.revealProgress`,
      });
    } else if (u.revealProgress < 0 || u.revealProgress > 1) {
      issues.push({
        code: "reveal_out_of_range",
        message: `revealProgress باید بین ۰ و ۱ باشد، نه ${u.revealProgress}.`,
        path: `${path}.revealProgress`,
      });
    }
  }
}

export function validateRapidAruzQuestion(question: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (typeof question !== "object" || question === null) {
    return {
      ok: false,
      issues: [{ code: "question_not_object", message: "سؤال باید یک شیء باشد." }],
      warnings,
    };
  }

  const q = question as Partial<RapidAruzQuestion>;

  if (!isNonEmptyString(q.id)) {
    issues.push({ code: "question_id_empty", message: "شناسهٔ سؤال خالی است.", path: "id" });
  }

  if (typeof q.previewText !== "string" || q.previewText.trim().length === 0) {
    issues.push({
      code: "preview_text_empty",
      message: "متنِ پیش‌نمایش خالی است.",
      path: "previewText",
    });
  }

  if (q.type !== undefined && !TYPES.has(q.type)) {
    issues.push({
      code: "question_type_invalid",
      message: `نوعِ ناشناخته: ${JSON.stringify(q.type)}`,
      path: "type",
    });
  }

  if (!Array.isArray(q.units) || q.units.length === 0) {
    issues.push({ code: "units_empty", message: "سؤال هیچ واحدی ندارد.", path: "units" });
    return { ok: issues.length === 0, issues, warnings };
  }

  const seenIds = new Set<string>();
  q.units.forEach((u, i) => validateUnit(u, i, seenIds, issues));

  // ── revealProgress: یکنواختیِ صعودی و رسیدن به آشکارسازیِ کامل ──
  const units = q.units as RapidAruzUnit[];
  const withReveal = units.filter(
    (u) => u && typeof u.revealProgress === "number" && Number.isFinite(u.revealProgress),
  );

  if (withReveal.length > 0) {
    let previous = 0;
    for (let i = 0; i < units.length; i++) {
      const value = units[i]?.revealProgress;
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      if (value < previous) {
        issues.push({
          code: "reveal_not_monotonic",
          message: `revealProgress باید نزولی نشود (${previous} → ${value}).`,
          path: `units[${i}].revealProgress`,
        });
      }
      previous = value;
    }

    if (withReveal.length === units.length) {
      const last = units[units.length - 1].revealProgress as number;
      if (last < 1) {
        issues.push({
          code: "reveal_incomplete",
          message: `وقتی همهٔ واحدها revealProgress دارند، آخرینشان باید به ۱ برسد (الان ${last}).`,
          path: `units[${units.length - 1}].revealProgress`,
        });
      }
    } else {
      warnings.push({
        code: "reveal_partial",
        message:
          "فقط بخشی از واحدها revealProgress دارند؛ بازی به آشکارسازیِ نمایشی (بر پایهٔ شمارهٔ واحد) برمی‌گردد.",
        path: "units",
      });
    }
  }

  // ── هشدار (نه خطا): آیا مجموعِ واحدها همان متنِ پیش‌نمایش است؟ ──
  // در تقطیعِ واقعی همیشه برقرار نیست (مثلاً «نَو اَز» که «نَ» + «وَز» تقطیع
  // می‌شود)، پس فقط هشدار است تا غلطِ تایپیِ نویسندهٔ داده دیده شود.
  if (typeof q.previewText === "string" && issues.length === 0 && !q.hasUnitTextOverlap) {
    const joined = stripSeparators(units.map((u) => u.display).join(""));
    const preview = stripSeparators(q.previewText);
    if (joined !== preview) {
      warnings.push({
        code: "units_text_mismatch",
        message: "چسباندنِ واحدها با متنِ پیش‌نمایش یکی نیست (اگر ادغامِ عروضی دارد طبیعی است).",
        path: "units",
      });
    }
  }

  return { ok: issues.length === 0, issues, warnings };
}

export interface QuestionScreeningResult {
  questions: RapidAruzQuestion[];
  rejected: { id: string; issues: ValidationIssue[] }[];
}

/**
 * سؤال‌های معتبر را نگه می‌دارد و بقیه را کنار می‌گذارد.
 *
 * در development جزئیاتِ کامل در کنسول چاپ می‌شود (با مسیرِ دقیقِ ایراد)؛
 * در production بی‌سروصدا رد می‌شود تا بازی نیفتد.
 */
export function screenRapidAruzQuestions(input: unknown[]): QuestionScreeningResult {
  const questions: RapidAruzQuestion[] = [];
  const rejected: { id: string; issues: ValidationIssue[] }[] = [];
  const seen = new Set<string>();

  for (const candidate of input) {
    const result = validateRapidAruzQuestion(candidate);
    const q = candidate as Partial<RapidAruzQuestion>;
    const id = typeof q?.id === "string" ? q.id : "(بی‌شناسه)";

    const issues = [...result.issues];
    if (result.ok && seen.has(id)) {
      issues.push({ code: "question_id_duplicate", message: `شناسهٔ سؤال تکراری است: ${id}` });
    }

    if (issues.length > 0) {
      rejected.push({ id, issues });
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[aruz-rapid] سؤالِ نامعتبر کنار گذاشته شد (${id}):`,
          issues.map((i) => `${i.path ?? "-"}: ${i.message}`).join(" | "),
        );
      }
      continue;
    }

    if (process.env.NODE_ENV !== "production" && result.warnings.length > 0) {
      console.warn(
        `[aruz-rapid] هشدار برای سؤال ${id}:`,
        result.warnings.map((w) => `${w.path ?? "-"}: ${w.message}`).join(" | "),
      );
    }

    seen.add(id);
    questions.push(candidate as RapidAruzQuestion);
  }

  return { questions, rejected };
}
