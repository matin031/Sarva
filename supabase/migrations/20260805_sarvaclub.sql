-- سروا کلاب — a moderated place where students publish their own شعر and talk
-- about each other's.
--
-- Run this once in the Supabase SQL editor for this project.
--
-- The whole point of the section is that nothing a visitor reads has skipped a
-- human: a سروده and every دیدگاه start life as 'pending' and become publicly
-- readable only when an admin approves them. That promise lives in the
-- `status = 'approved'` predicate of the public read policies below — RLS, not
-- the UI, is what enforces it, so a forgotten filter in a query can never leak
-- an unreviewed poem.
--
-- Author names are denormalised onto the rows (`author_name`) instead of being
-- joined from `profiles`. Two reasons: `profiles` has a self-read-only policy,
-- so a public feed could not join it at all; and a دیدگاه should keep showing
-- the name it was actually posted under (the same reasoning `user_bookmarks`
-- uses for its `payload` snapshot).

create extension if not exists pgcrypto;

-- ------------------------------------------------------------- سروده‌ها ----

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- name shown next to the poem: the account's full_name at submit time, or
  -- the pen name when the poet publishes بی‌نام
  author_name text not null,
  -- «خجالتی هستم» is the reason this section exists — a poet may publish under
  -- a pen name (or none at all) while the admin panel still sees the account
  is_anonymous boolean not null default false,
  title text,
  -- the poem itself: lines separated by newlines, kept verbatim
  body text not null constraint club_posts_body_len check (char_length(body) between 5 and 4000),
  form text not null default 'other'
    constraint club_posts_form_check check (form in (
      'ghazal', 'ghaside', 'masnavi', 'robaee', 'dobeyti',
      'chaharpare', 'ghete', 'nimaei', 'sepid', 'other'
    )),
  -- optional themes, validated against a whitelist in lib/club/types.ts before
  -- insert; an array so the feed can filter on «عاشقانه» or «طنز»
  tags text[] not null default '{}'::text[],
  -- وزن, either typed by the poet or filled in by the site's aruz engine
  meter text,
  status text not null default 'pending'
    constraint club_posts_status_check check (status in ('pending', 'approved', 'rejected')),
  -- what the admin told the poet when sending a سروده back
  review_note text,
  -- «برگزیدهٔ سردبیر» — pinned to the top of the feed
  featured boolean not null default false,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the feed: approved poems, newest (or most liked) first, optionally by form
create index if not exists club_posts_feed_idx
  on public.club_posts (status, featured desc, published_at desc);
create index if not exists club_posts_likes_idx
  on public.club_posts (status, like_count desc, published_at desc);
-- «سروده‌های من» in the user panel, and the admin's moderation queue
create index if not exists club_posts_user_idx
  on public.club_posts (user_id, created_at desc);
create index if not exists club_posts_status_idx
  on public.club_posts (status, created_at desc);
create index if not exists club_posts_tags_idx
  on public.club_posts using gin (tags);

-- ------------------------------------------------------------ دیدگاه‌ها ----

create table if not exists public.club_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.club_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- unlike a سروده, a دیدگاه is always signed: the account's own name, never
  -- a pen name. Snapshotted here for the same reason as club_posts.
  author_name text not null,
  -- one level of replies is enough for a comment thread this size; the app
  -- refuses to nest a reply under a reply
  parent_id uuid references public.club_comments(id) on delete cascade,
  body text not null constraint club_comments_body_len check (char_length(body) between 2 and 1500),
  status text not null default 'pending'
    constraint club_comments_status_check check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists club_comments_post_idx
  on public.club_comments (post_id, status, created_at);
create index if not exists club_comments_user_idx
  on public.club_comments (user_id, created_at desc);
create index if not exists club_comments_status_idx
  on public.club_comments (status, created_at desc);

-- ------------------------------------------------------------- پسندیدن ----

create table if not exists public.club_likes (
  post_id uuid not null references public.club_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists club_likes_user_idx on public.club_likes (user_id);

-- ------------------------------------------------------------- گزارش‌ها ----

create table if not exists public.club_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null
    constraint club_reports_target_check check (target_type in ('post', 'comment')),
  -- deliberately not a foreign key: a report should survive the admin deleting
  -- the thing it is about, so the log still explains why it went
  target_id uuid not null,
  reason text not null
    constraint club_reports_reason_check check (reason in ('plagiarism', 'offensive', 'spam', 'off_topic', 'other')),
  note text,
  status text not null default 'open'
    constraint club_reports_status_check check (status in ('open', 'resolved', 'dismissed')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- reporting the same thing twice is a no-op, not a second row in the queue
  unique (reporter_id, target_type, target_id)
);

create index if not exists club_reports_status_idx
  on public.club_reports (status, created_at desc);

-- ------------------------------------------- counters kept by the database ----

-- `like_count` and `comment_count` are denormalised so the feed is one query
-- instead of one aggregate per card. They are maintained here rather than in
-- the app: a like inserted by a signed-in user has no permission to update
-- someone else's سروده, and security definer is exactly the escape hatch for
-- "this row may only be changed as a side effect of that row".

create or replace function public.club_sync_like_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.club_posts p
     set like_count = (select count(*) from public.club_likes l where l.post_id = p.id)
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

drop trigger if exists club_likes_count on public.club_likes;
create trigger club_likes_count
  after insert or delete on public.club_likes
  for each row execute function public.club_sync_like_count();

-- only approved دیدگاه‌ها count: the number under a poem must match the number
-- of comments a visitor can actually read
create or replace function public.club_sync_comment_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
begin
  update public.club_posts p
     set comment_count = (
           select count(*) from public.club_comments c
            where c.post_id = p.id and c.status = 'approved'
         )
   where p.id = target;
  return null;
end;
$$;

drop trigger if exists club_comments_count on public.club_comments;
create trigger club_comments_count
  after insert or update or delete on public.club_comments
  for each row execute function public.club_sync_comment_count();

-- ------------------------------------------- columns the app owns, not you ----

-- The anon key ships to the browser, so "the server action never sets this"
-- is not a guarantee — anyone can talk to PostgREST directly with their own
-- session and patch their own row. RLS says *which rows*; these triggers say
-- *which columns*, by quietly restoring the values a poet has no business
-- choosing.
--
-- Deciding *whose* statement this is takes two tests, and neither is
-- `current_user`: these functions are security definer, which rewrites
-- current_user to the owner and would make every caller look like an admin.
--   • the JWT's `role` claim — 'authenticated'/'anon' is a request from the
--     browser; 'service_role' is the admin panel and passes through; no claim
--     at all is someone in the SQL editor, who also passes through.
--   • `pg_trigger_depth()` — the counter triggers above update club_posts from
--     inside a *user's* request, so their JWT still says 'authenticated'. That
--     nested update runs one level deeper, and must not be second-guessed or
--     like_count would be restored to its old value the instant it changed.

create or replace function public.club_is_client_write()
returns boolean
language plpgsql
stable
as $$
declare
  claim_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  return pg_trigger_depth() <= 1 and coalesce(claim_role, '') in ('authenticated', 'anon');
end;
$$;

create or replace function public.club_posts_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  account_name text;
begin
  if not public.club_is_client_write() then
    return new;
  end if;

  -- a سروده published under your own name is published under your *account's*
  -- name; the pen name field only applies to a بی‌نام poem
  if not new.is_anonymous then
    select nullif(trim(full_name), '') into account_name
      from public.profiles where id = new.user_id;
    new.author_name := coalesce(account_name, nullif(trim(new.author_name), ''), 'کاربر سروا');
  else
    new.author_name := coalesce(nullif(trim(new.author_name), ''), 'ناشناس');
  end if;

  if tg_op = 'INSERT' then
    new.like_count := 0;
    new.comment_count := 0;
    new.featured := false;
    new.status := 'pending';
    new.published_at := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  else
    -- an edit is a resubmission: the review verdict and every number the site
    -- keeps about the poem survive it untouched
    new.user_id := old.user_id;
    new.like_count := old.like_count;
    new.comment_count := old.comment_count;
    new.published_at := old.published_at;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.featured := false;
    new.status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists club_posts_guard on public.club_posts;
create trigger club_posts_guard
  before insert or update on public.club_posts
  for each row execute function public.club_posts_guard();

-- «نظرشون با اسمی که برای اکانتشون گذاشتن باید باشه» — enforced here rather
-- than in the form, so a دیدگاه cannot be signed with anyone else's name.
create or replace function public.club_comments_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  account_name text;
begin
  if not public.club_is_client_write() then
    return new;
  end if;

  select nullif(trim(full_name), '') into account_name
    from public.profiles where id = new.user_id;
  new.author_name := coalesce(account_name, nullif(trim(new.author_name), ''), 'کاربر سروا');
  new.status := 'pending';
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.review_note := null;
  return new;
end;
$$;

drop trigger if exists club_comments_guard on public.club_comments;
create trigger club_comments_guard
  before insert on public.club_comments
  for each row execute function public.club_comments_guard();

create or replace function public.club_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists club_posts_touch on public.club_posts;
create trigger club_posts_touch
  before update on public.club_posts
  for each row execute function public.club_touch_updated_at();

-- ---------------------------------------------------------------- grants ----

-- RLS decides *which rows*; Postgres still checks table GRANTs first, and new
-- tables made in the SQL editor don't reliably inherit them.
grant usage on schema public to anon, authenticated, service_role;

grant select on public.club_posts, public.club_comments to anon, authenticated;
grant insert, update, delete on public.club_posts, public.club_comments to authenticated;
grant select, insert, delete on public.club_likes to authenticated;
grant select, insert on public.club_reports to authenticated;

grant select, insert, update, delete on
  public.club_posts,
  public.club_comments,
  public.club_likes,
  public.club_reports
to service_role;

-- ------------------------------------------------------------------- RLS ----

alter table public.club_posts enable row level security;
alter table public.club_comments enable row level security;
alter table public.club_likes enable row level security;
alter table public.club_reports enable row level security;

-- سروده‌ها ------------------------------------------------------------------

drop policy if exists "club posts: approved are public" on public.club_posts;
create policy "club posts: approved are public"
  on public.club_posts for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "club posts: own rows readable" on public.club_posts;
create policy "club posts: own rows readable"
  on public.club_posts for select
  to authenticated
  using (user_id = auth.uid());

-- A poet may only ever create a 'pending' row, never a published or featured
-- one. This is the reason the submit action cannot be tricked into publishing.
drop policy if exists "club posts: own insert as pending" on public.club_posts;
create policy "club posts: own insert as pending"
  on public.club_posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and featured = false
    and reviewed_by is null
    and published_at is null
  );

-- Editing a published سروده sends it back to the queue — the check clause makes
-- that automatic rather than something the app has to remember.
drop policy if exists "club posts: own update returns to queue" on public.club_posts;
create policy "club posts: own update returns to queue"
  on public.club_posts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'pending' and featured = false);

drop policy if exists "club posts: own delete" on public.club_posts;
create policy "club posts: own delete"
  on public.club_posts for delete
  to authenticated
  using (user_id = auth.uid());

-- دیدگاه‌ها -------------------------------------------------------------------

drop policy if exists "club comments: approved are public" on public.club_comments;
create policy "club comments: approved are public"
  on public.club_comments for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "club comments: own rows readable" on public.club_comments;
create policy "club comments: own rows readable"
  on public.club_comments for select
  to authenticated
  using (user_id = auth.uid());

-- a دیدگاه may only be written on a سروده that is actually published
drop policy if exists "club comments: own insert as pending" on public.club_comments;
create policy "club comments: own insert as pending"
  on public.club_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.club_posts p
       where p.id = post_id and p.status = 'approved'
    )
  );

drop policy if exists "club comments: own delete" on public.club_comments;
create policy "club comments: own delete"
  on public.club_comments for delete
  to authenticated
  using (user_id = auth.uid());

-- پسندیدن ---------------------------------------------------------------------

-- Only your own likes are readable: the feed shows a total (from like_count)
-- and whether *you* liked it, never who else did.
drop policy if exists "club likes: own rows readable" on public.club_likes;
create policy "club likes: own rows readable"
  on public.club_likes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "club likes: own insert" on public.club_likes;
create policy "club likes: own insert"
  on public.club_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.club_posts p
       where p.id = post_id and p.status = 'approved'
    )
  );

drop policy if exists "club likes: own delete" on public.club_likes;
create policy "club likes: own delete"
  on public.club_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- گزارش‌ها ---------------------------------------------------------------------

drop policy if exists "club reports: own rows readable" on public.club_reports;
create policy "club reports: own rows readable"
  on public.club_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "club reports: own insert" on public.club_reports;
create policy "club reports: own insert"
  on public.club_reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
