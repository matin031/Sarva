-- Bookmarks ("نشان‌شده‌ها") — one table for every part of the site.
--
-- A student can flag a question while playing واژه‌یاب, while answering an
-- عروض test, or inside an امتحان نهایی, and later find all of them in the
-- panel. Keeping one table (rather than one per feature) means the panel has a
-- single query and a new feature only has to pick an `area`.
--
-- `payload` carries enough to render a preview without joining back to the
-- source — the source row may be edited or deleted, and a bookmark should keep
-- showing what the student actually saw.

create table if not exists public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null check (area in ('aruz', 'vocab', 'exam', 'jasoos')),
  -- identifies the bookmarked thing inside its area; text because the areas
  -- disagree about key shape (uuid, word id, "examId:questionIndex")
  ref_id text not null,
  title text not null,
  subtitle text,
  payload jsonb not null default '{}'::jsonb,
  -- the student's own note, added from the panel
  note text,
  created_at timestamptz not null default now(),
  -- flagging the same question twice is a toggle, not a second row
  unique (user_id, area, ref_id)
);

create index if not exists user_bookmarks_user_idx
  on public.user_bookmarks (user_id, created_at desc);
create index if not exists user_bookmarks_user_area_idx
  on public.user_bookmarks (user_id, area, created_at desc);

-- Table privileges. RLS decides *which rows* a student may touch, but Postgres
-- still has to allow the API role to touch the table at all — without this the
-- client gets "permission denied for table user_bookmarks" and never reaches
-- the policies below. `anon` is deliberately left out: every policy requires
-- auth.uid(), so a signed-out visitor has nothing to read or write here.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.user_bookmarks to authenticated;

alter table public.user_bookmarks enable row level security;

drop policy if exists "own bookmarks readable" on public.user_bookmarks;
create policy "own bookmarks readable"
  on public.user_bookmarks for select
  using (auth.uid() = user_id);

drop policy if exists "own bookmarks insertable" on public.user_bookmarks;
create policy "own bookmarks insertable"
  on public.user_bookmarks for insert
  with check (auth.uid() = user_id);

drop policy if exists "own bookmarks updatable" on public.user_bookmarks;
create policy "own bookmarks updatable"
  on public.user_bookmarks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own bookmarks deletable" on public.user_bookmarks;
create policy "own bookmarks deletable"
  on public.user_bookmarks for delete
  using (auth.uid() = user_id);
