-- Exam question bank schema (Phase 1)
-- Scope: storing exam papers + their questions, exactly one row per scorable
-- "part" of a question, typed against the 23-type catalogue from
-- spec-azmoon-online.md. Student attempts/answers are NOT part of this
-- migration — that is a later phase once the authoring model is settled.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- The 18 *atomic* input mechanisms. Each value maps 1:1 to one React
-- component. The 5 catalogue types that are not here (multi-subquestion,
-- bracket-choice-mcq, multi-item-true-false, multi-paraphrase-block,
-- list-of-parallel-blanks) are "container patterns": a question of one of
-- those shapes is just several question_parts rows (each an atomic type
-- below) sharing one `questions` row. See questions.layout_pattern.
create type question_part_type as enum (
  'word-meaning-input',
  'mcq-inline',
  'mcq-multi-select',
  'mcq-plus-correction',
  'short-text-answer',
  'true-false',
  'multi-part-inline-tagging',
  'diagram-builder',
  'fill-blank-term',
  'two-answer-text',
  'word-reorder-dnd',
  'verse-completion',
  'matching-pairs-with-distractor',
  'count-answer',
  'paired-list-error-correction',
  'find-n-errors-in-list',
  'open-error-correction-in-passage',
  'mcq-select-line-in-poem'
);

-- How a part gets scored. Direct-comparison types (mcq/matching/reorder/
-- true-false/count/diagram) use exact_match. Free-text types default to
-- ai_semantic (LLM compares meaning, not just literal string). Types with
-- explicit partial credit across sub-items (paired-list-error-correction,
-- find-n-errors-in-list) use ai_partial_credit. 'manual' is an escape hatch
-- for anything a human grader needs to review.
create type grading_mode as enum (
  'exact_match',
  'ai_semantic',
  'ai_partial_credit',
  'manual'
);

-- ---------------------------------------------------------------------------
-- exams / exam_sections / questions / question_parts / question_options
-- ---------------------------------------------------------------------------

create table exams (
  id uuid primary key default gen_random_uuid(),
  subject text not null,               -- e.g. 'farsi3' — kept as plain text for now;
                                        -- normalize into a subjects table once a second
                                        -- subject (عربی، دین‌وزندگی، ...) actually ships.
  grade smallint not null,             -- 10 / 11 / 12
  title text not null,                 -- 'فارسی۳ دوازدهم — خرداد ۱۴۰۳'
  exam_session text,                   -- 'kherdad-1403', 'kherdad-1404-06', ...
  total_score numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

create table exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  title text not null,                 -- 'قلمرو زبانی' / 'قلمرو ادبی' / 'قلمرو فکری'
  order_index smallint not null,
  section_score numeric(5,2) not null, -- declared total (7 / 5 / 8); cross-checked
                                        -- against sum(question_parts.score) in app code,
                                        -- not enforced in SQL (avoids fragile triggers).
  unique (exam_id, order_index)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_section_id uuid not null references exam_sections(id) on delete cascade,
  number smallint not null,            -- display number, 1..41
  page_ref smallint,                   -- textbook page, display-only
  stimulus jsonb,                      -- shared RichPassage (poem/paragraph) shown once
                                        -- before all parts; null if the part(s) carry
                                        -- their own text. See lib/exam/content-schemas.ts.
  instruction text,                    -- صورت‌سؤال / instructions text
  layout_pattern text
    constraint questions_layout_pattern_check check (
      layout_pattern is null or layout_pattern in (
        'multi-subquestion',
        'bracket-choice-mcq',
        'multi-item-true-false',
        'multi-paraphrase-block',
        'list-of-parallel-blanks'
      )
    ),                                 -- informational only — rendering NEVER branches
                                        -- on this, it always just iterates parts in order.
  order_index smallint not null,
  unique (exam_section_id, number)
);

create table question_parts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  part_index smallint not null default 0,
  label text,                          -- 'الف' / 'ب' / ... — null for single-part questions
  type question_part_type not null,
  score numeric(5,2) not null check (score > 0),  -- exact decimal, never float — see notes
  content jsonb not null,              -- type-specific shape, validated app-side via the
                                        -- Zod discriminated union in lib/exam/content-schemas.ts
  correct_answer jsonb not null,       -- type-specific answer key
  accepted_answers jsonb,              -- nullable string[] of alternate literal answers
                                        -- (free-text types only, e.g. both 'ب' and the
                                        -- option's own text)
  grading_mode grading_mode not null default 'exact_match',
  ai_grading_hint text,                -- extra instruction injected into the AI grading
                                        -- prompt, e.g. "پاسخ باید شامل واژه «التزامی» باشد"
  unique (question_id, part_index)
);

create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_part_id uuid not null references question_parts(id) on delete cascade,
  option_key text,                     -- 'الف' / 'ب' / 'ج' / ... — null if unlabeled
  order_index smallint not null,
  text text not null,
  highlight_ranges jsonb,              -- nullable [{start,end}] char offsets into `text`
                                        -- for decorative underline (vocab emphasis inside
                                        -- an option), unrelated to blank/input tokens
  is_correct boolean not null default false,
  unique (question_part_id, order_index)
);

create index questions_exam_section_id_idx on questions (exam_section_id);
create index question_parts_question_id_idx on question_parts (question_id);
create index question_options_question_part_id_idx on question_options (question_part_id);

-- Convenience view: per-question total score (sum of its parts), used to
-- cross-check against exam_sections.section_score / exams.total_score.
create view question_totals as
  select
    q.id as question_id,
    q.exam_section_id,
    q.number,
    sum(qp.score) as total_score
  from questions q
  join question_parts qp on qp.question_id = q.id
  group by q.id, q.exam_section_id, q.number;
