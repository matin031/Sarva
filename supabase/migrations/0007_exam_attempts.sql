-- Persists a student's finished exam attempt for admin-facing stats. The
-- exam-taking flow itself (components/exam/ExamRunner.tsx) is otherwise
-- entirely client-side + localStorage — this is purely an after-the-fact
-- record, written once when a signed-in student reaches the results
-- screen. Guests (not signed in) are simply never persisted, same as the
-- poetry quiz's quiz_attempts already work (see components/UI/Quiz.tsx's
-- saveQuizAttempt — identical "if (!user) return" guard).
--
-- question_results is a jsonb snapshot of the same
-- Record<questionNumber, QuestionResult> shape ExamResults.tsx already
-- renders from — kept denormalized (not split into a per-part answers
-- table) since nothing needs to query into individual parts, only display
-- a full attempt's breakdown again for a given user.
create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  total_score numeric(6,2) not null,
  max_score numeric(6,2) not null,
  question_results jsonb not null,
  created_at timestamptz not null default now()
);

create index exam_attempts_user_id_idx on exam_attempts (user_id);
create index exam_attempts_exam_id_idx on exam_attempts (exam_id);

-- Same posture as every other exam_bank table: no anon/authenticated
-- policy at all. The student-facing write goes through
-- submitExamAttempt() (app/exam/[examKey]/actions.ts), a server action
-- that reads the caller's own session to set user_id and then writes via
-- the service-role client — the RLS-bypass path, not a client-side
-- insert. Same reasoning as why question_parts.correct_answer never gets
-- an RLS read policy either: the boundary is "server-validated", not
-- "policy-permitted".
alter table exam_attempts enable row level security;

grant select, insert, update, delete on exam_attempts to service_role;
