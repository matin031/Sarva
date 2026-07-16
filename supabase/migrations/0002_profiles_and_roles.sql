-- Profiles + roles (Phase 1 admin panel groundwork)
-- Scope: a minimal, extensible role system. Only 'admin' is used by the
-- exam-authoring panel today, but this is a real roles table (not a
-- hardcoded email check) so 'teacher' or other roles can be added later
-- without a schema change — just a new allowed value + new RLS policies
-- that check for it.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student'
    constraint profiles_role_check check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Every signed-in user can read their own profile (the app needs this to
-- know whether to show admin UI) but not anyone else's.
create policy "profiles: self read"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- Nobody can write their own role from the client — role changes only
-- happen server-side via the service-role key (e.g. an operator promoting
-- an account to admin directly in the DB or through a future super-admin
-- tool), which bypasses RLS entirely. No insert/update/delete policy is
-- defined here on purpose: the default is deny.

-- Auto-create a 'student' profile row the moment someone signs up, so
-- every auth.users row always has a matching profiles row and app code
-- never has to handle a missing profile.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
