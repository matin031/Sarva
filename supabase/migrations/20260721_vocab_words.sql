-- run this once in the Supabase SQL editor for this project.
-- The word bank for the واژه‌یاب picture-vocabulary game. Words are public
-- content: anyone (signed in or not) may read them to play. Only the admin
-- panel writes to this table, and it does so through the service-role key
-- (lib/supabase-admin.ts), which bypasses RLS — so there is no client
-- insert/update/delete policy here on purpose.

create extension if not exists pgcrypto;

create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  grade text not null
    constraint vocab_words_grade_check check (grade in ('dahom', 'yazdahom', 'davazdahom')),
  lesson smallint not null
    constraint vocab_words_lesson_check check (lesson between 1 and 18),
  word text not null,
  meaning text not null,
  image text not null default '',
  sort_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vocab_words_grade_lesson_idx
  on public.vocab_words (grade, lesson, sort_index);

alter table public.vocab_words enable row level security;

-- public read: the game shows these words to everyone
create policy "Anyone can read vocab words"
  on public.vocab_words
  for select
  using (true);

-- RLS still requires an explicit table-level GRANT for the roles to run
-- select at all — grant read to both anonymous and signed-in visitors.
grant select on public.vocab_words to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: درس دوم فارسی دهم (the 15 words already used while testing). Safe to
-- re-run — it only inserts if this lesson is still empty.
-- ---------------------------------------------------------------------------
insert into public.vocab_words (grade, lesson, word, meaning, image, sort_index)
select * from (values
  ('dahom', 2::smallint, 'میاسا', 'دست نکش', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/1.png', 1::smallint),
  ('dahom', 2, 'داد', 'عدالت', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/2.png', 2),
  ('dahom', 2, 'مستغنی', 'بی‌نیاز', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/3.png', 3),
  ('dahom', 2, 'تیمار', 'پرستاری و دلسوزی', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/4.png', 4),
  ('dahom', 2, 'فعل', 'کار', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/5.png', 5),
  ('dahom', 2, 'محال', 'غیرممکن', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/6.png', 6),
  ('dahom', 2, 'ضایع', 'تباه', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/7.png', 7),
  ('dahom', 2, 'قرابت', 'نزدیکی، خویشی، خویشاوندی؛ در متن درس، منظور «خویشاوند» است.', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/8.png', 8),
  ('dahom', 2, 'خاصه', 'ویژه', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/9.png', 9),
  ('dahom', 2, 'حرمت', 'احترام', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/10.png', 10),
  ('dahom', 2, 'مولع', 'حریص شدن به چیزی، بسیار مشتاق', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/11.png', 11),
  ('dahom', 2, 'ننگ', 'شرمساری', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/12.png', 12),
  ('dahom', 2, 'رسته', 'نجات یافت', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/13.png', 13),
  ('dahom', 2, 'عَمَله', 'جمع عامل، کارگران', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/14.png', 14),
  ('dahom', 2, 'نموده', 'نشان داده، ارائه کرده، آشکار کرده', 'https://raw.githubusercontent.com/ramtin1111/testPics/main/15.png', 15)
) as seed(grade, lesson, word, meaning, image, sort_index)
where not exists (
  select 1 from public.vocab_words w where w.grade = 'dahom' and w.lesson = 2
);
