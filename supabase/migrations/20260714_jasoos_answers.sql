-- run this once in the Supabase SQL editor for this project.
-- stores every attempt (correct or wrong) a signed-in user makes in the
-- جاسوسِ نقش‌ها game, so it can be shown in their panel history.

create table if not exists public.jasoos_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id integer not null,
  category text not null,
  verse_line_1 text not null,
  verse_line_2 text not null,
  chosen_role text not null,
  correct_role text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists jasoos_answers_user_id_idx
  on public.jasoos_answers (user_id);

create index if not exists jasoos_answers_user_id_answered_at_idx
  on public.jasoos_answers (user_id, answered_at desc);

alter table public.jasoos_answers enable row level security;

create policy "Users can view their own jasoos answers"
  on public.jasoos_answers
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own jasoos answers"
  on public.jasoos_answers
  for insert
  with check (auth.uid() = user_id);

-- RLS policies only decide *which rows* a role can touch — Postgres still
-- requires an explicit table-level GRANT before the "authenticated" role
-- (what signed-in Supabase users act as) can run select/insert at all.
-- Without this you'll see "permission denied for table jasoos_answers"
-- even though the policies above are correct.
grant select, insert on public.jasoos_answers to authenticated;
