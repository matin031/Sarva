-- The quiz feature's questions/question_options tables predate any
-- migration file in this repo (created directly in Supabase, never
-- tracked). The admin panel's write actions (lib/quiz/admin-actions.ts)
-- use the service-role client the same way the exam bank's do — granting
-- explicitly up front instead of finding out the hard way again (see
-- 0005_grant_service_role.sql for why this is needed at all).
grant select, insert, update, delete on questions, question_options to service_role;
