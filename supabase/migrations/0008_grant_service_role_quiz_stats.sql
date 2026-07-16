-- Same story as 0006_grant_service_role_quiz.sql: quiz_attempts,
-- quiz_attempt_answers, and user_answers predate any migration file in
-- this repo and never got an explicit service_role grant. The new admin
-- stats actions (lib/admin/quiz-stats-actions.ts) read these tables with
-- the service-role client, which fails with "permission denied" without
-- this grant.
grant select, insert, update, delete on quiz_attempts, quiz_attempt_answers, user_answers to service_role;
