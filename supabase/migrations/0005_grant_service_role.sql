-- Explicit grants for service_role on every exam_bank table + profiles.
-- RLS bypass (service_role has rolbypassrls) is a separate mechanism from
-- basic table GRANTs — Postgres checks GRANTs first regardless of RLS, and
-- new tables created via the SQL editor don't reliably inherit them on
-- every project. Being explicit here instead of assuming it "just works".
grant usage on schema public to service_role;

grant select, insert, update, delete on
  exams,
  exam_sections,
  exam_questions,
  exam_question_parts,
  exam_question_options,
  profiles
to service_role;
