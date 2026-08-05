-- سروا کلاب: «پاسخ به پاسخ»
--
-- Run this in the Supabase SQL editor after 20260805_sarvaclub.sql.
--
-- The thread stays two levels deep — a reply to a reply still hangs off the
-- same root comment, because a phone cannot afford a third indent — but it now
-- records *which* comment it was answering. That is what every site you have
-- ever replied on actually does: YouTube, Instagram and Facebook all flatten
-- past level two and keep the addressee as a mention instead.
--
-- Deliberately an id rather than a name: the label under a reply is rendered
-- from the referenced row's own author_name, so nobody can sign a reply as
-- «در پاسخ به مدیر سایت» by hand. If the addressed comment is later deleted the
-- reference simply falls away and the reply stays put.

alter table public.club_comments
  add column if not exists reply_to_id uuid
    references public.club_comments(id) on delete set null;

create index if not exists club_comments_reply_to_idx
  on public.club_comments (reply_to_id);
