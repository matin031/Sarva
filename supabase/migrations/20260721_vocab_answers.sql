-- run this once in the Supabase SQL editor for this project.
-- stores every answer a signed-in user gives in the واژه‌یاب game (correct or
-- wrong) so their missed words can be shown in the user panel. The word and
-- meaning are stored denormalized on the row so the panel needs no join and
-- keeps working even if the word is later edited or removed from the bank.

create table if not exists public.vocab_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grade text not null,
  lesson smallint not null,
  word text not null,
  meaning text not null,
  image text not null default '',
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists vocab_answers_user_id_idx
  on public.vocab_answers (user_id);

create index if not exists vocab_answers_user_answered_at_idx
  on public.vocab_answers (user_id, answered_at desc);

alter table public.vocab_answers enable row level security;

create policy "Users can view their own vocab answers"
  on public.vocab_answers
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own vocab answers"
  on public.vocab_answers
  for insert
  with check (auth.uid() = user_id);

-- RLS decides which rows; a table-level GRANT is still required for the
-- "authenticated" role to run select/insert at all.
grant select, insert on public.vocab_answers to authenticated;
