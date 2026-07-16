-- Lock down the exam bank + drop two columns that drifted out of sync with
-- the content model that actually shipped in lib/exam/content-schemas.ts.
--
-- Security model: exam_question_parts.correct_answer (and accepted_answers,
-- ai_grading_hint) is the answer key. No anon/authenticated policy is
-- granted on any exam_bank table here — on purpose, deny-by-default. All
-- reads/writes go through the service-role key from server-only code
-- (lib/supabase-admin.ts), which bypasses RLS entirely and never reaches
-- the browser. This mirrors the existing split between lib/exam/grading.ts
-- (server-only, has the answer key) and lib/exam/client-exam.ts
-- (toClientExam() strips it before the client ever sees the payload) —
-- same boundary, now enforced at the DB layer too, not just in app code.

alter table exams enable row level security;
alter table exam_sections enable row level security;
alter table exam_questions enable row level security;
alter table exam_question_parts enable row level security;
alter table exam_question_options enable row level security;

-- exam_questions.stimulus assumed one shared RichPassage per question. In
-- practice every stimulus ended up living on individual exam_question_parts
-- (lib/exam/content-schemas.ts's per-type `stimulus` field), because
-- multi-subquestion parts often need their own separate excerpt. The
-- column was never populated — dropping it instead of leaving a dead,
-- misleading field.
alter table exam_questions drop column stimulus;

-- exam_question_options.highlight_ranges (char-offset ranges into `text`)
-- was superseded by the simpler {{word}} inline markup convention embedded
-- directly in `text` and parsed at render time by
-- components/exam/HighlightedText.tsx. Never populated — dropping it.
alter table exam_question_options drop column highlight_ranges;
