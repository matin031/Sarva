-- What the student actually answered, so the panel can show their answer next
-- to the correct one. `question_results` only ever carried the score and the
-- answer key; the student's own words were thrown away at the results screen.
--
-- Keyed "questionNumber:partIndex" — the same key ExamRunner already uses for
-- its in-progress state, so nothing has to be re-mapped on the way in or out.
alter table exam_attempts
  add column if not exists answers jsonb not null default '{}'::jsonb;
